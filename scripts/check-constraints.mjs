#!/usr/bin/env node
/**
 * Garde-fous de conception du site, vérifiés sur la sortie de build.
 *
 * Le site est servi sous une CSP `default-src 'none'` posée dans le dépôt privé
 * `homelab`, donc invisible depuis ici : rien dans ce dépôt ne signale qu'un
 * `<script>`, un style inline ou une police distante casserait la page en
 * production. Ces contrôles tiennent ce contrat à la place de la CSP.
 *
 * Usage : npm run check:constraints   (après `npm run build`)
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');

/** Attributs qui déclenchent une requête sortante du navigateur. */
const FETCHING_ATTRS = new Set([
  'src',
  'srcset',
  'imagesrcset',
  'poster',
  'data',
  'action',
  'formaction',
  'background',
]);

/** Valeurs de `rel` qui désignent une relation, pas une ressource à charger. */
const DECLARATIVE_RELS = new Set([
  'canonical',
  'alternate',
  'me',
  'author',
  'license',
  'prev',
  'next',
]);

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/** Numéro de ligne (1-indexé) de la position `index` dans `content`. */
function lineAt(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content[i] === '\n') line += 1;
  }
  return line;
}

/**
 * Une URL pointe-t-elle hors du site ?
 * Les schémas autres que http/https (`data:`, `mailto:`) ne sont pas une
 * ressource tierce et sortent du périmètre de ce contrôle.
 */
function isExternal(url, ownHost) {
  const value = url.trim();
  if (value.startsWith('//')) return true;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    return new URL(value).host !== ownHost;
  } catch {
    return true;
  }
}

/** Les URLs d'un attribut, en dépliant la syntaxe `srcset`. */
function urlsOf(attrName, value) {
  if (attrName !== 'srcset' && attrName !== 'imagesrcset') return [value];
  return value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/** Les attributs d'une balise, sous forme de map nom → valeur. */
function parseAttrs(raw) {
  const attrs = new Map();
  const pattern = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  for (const match of raw.matchAll(pattern)) {
    attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

// ---------------------------------------------------------------------------
// Contrôles — fonctions pures sur (chemin, contenu), testables isolément
// ---------------------------------------------------------------------------

const INLINE_PATTERNS = [
  { pattern: /<script\b/gi, label: 'balise <script>' },
  { pattern: /<style\b/gi, label: 'balise <style>' },
  { pattern: /\sstyle\s*=\s*["']/gi, label: 'attribut style=""' },
];

/** Aucun script ni style inline dans une page. */
export function checkNoInline(file, content) {
  const violations = [];
  for (const { pattern, label } of INLINE_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      violations.push({ file, line: lineAt(content, match.index), detail: label });
    }
  }
  return violations;
}

/** Aucune ressource tierce chargée par une page. */
export function checkNoThirdPartyHtml(file, content, ownHost) {
  const violations = [];

  for (const tag of content.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
    const [, tagName, rawAttrs] = tag;
    const name = tagName.toLowerCase();
    const attrs = parseAttrs(rawAttrs);
    const line = lineAt(content, tag.index);
    const rel = (attrs.get('rel') ?? '').toLowerCase();

    for (const [attr, value] of attrs) {
      // Un <a href> vers l'extérieur dans le corps d'un texte est légitime : il
      // ne charge rien, c'est le lecteur qui décide de le suivre. Seuls les
      // attributs qui provoquent une requête, et le href d'un <link> non
      // déclaratif (stylesheet, preload, preconnect…), sont contraints.
      const fetchesResource = FETCHING_ATTRS.has(attr) || (name === 'link' && attr === 'href' && !DECLARATIVE_RELS.has(rel));
      if (!fetchesResource) continue;

      for (const url of urlsOf(attr, value)) {
        if (isExternal(url, ownHost)) {
          violations.push({ file, line, detail: `<${name} ${attr}="${url}">` });
        }
      }
    }
  }
  return violations;
}

/** Aucune ressource tierce chargée par une feuille de style (polices, imports). */
export function checkNoThirdPartyCss(file, content, ownHost) {
  const violations = [];
  const patterns = [
    /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi,
    /@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (isExternal(match[1], ownHost)) {
        violations.push({ file, line: lineAt(content, match.index), detail: match[0].trim() });
      }
    }
  }
  return violations;
}

/** `inlineStylesheets: 'never'`, sans quoi Astro inline les petites feuilles. */
export function checkInlineStylesheets(configPath, config) {
  const value = config.build?.inlineStylesheets;
  if (value === 'never') return [];
  return [
    {
      file: configPath,
      line: 1,
      detail: `build.inlineStylesheets vaut ${JSON.stringify(value)} au lieu de 'never'`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------

/** Les fichiers de `dir` dont le nom finit par un des suffixes donnés, lus. */
async function collect(dir, suffixes) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  const files = entries
    .filter((entry) => entry.isFile() && suffixes.some((suffix) => entry.name.endsWith(suffix)))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();

  return Promise.all(
    files.map(async (path) => ({ path, content: await readFile(path, 'utf8') }))
  );
}

/**
 * La config Astro est importée, pas lue au grep : un `inlineStylesheets`
 * commenté, ou écrasé plus bas dans le fichier, passerait un grep.
 */
async function loadAstroConfig() {
  const module = await import(new URL('../astro.config.mjs', import.meta.url).href);
  return module.default;
}

function report(title, violations) {
  if (violations.length === 0) {
    console.log(`  ✓ ${title}`);
    return 0;
  }
  console.log(`  ✗ ${title}`);
  for (const { file, line, detail } of violations) {
    console.log(`      ${relative(ROOT, file)}:${line} — ${detail}`);
  }
  return violations.length;
}

async function main() {
  try {
    await stat(DIST);
  } catch {
    console.error('dist/ est absent : lance `npm run build` avant les garde-fous.');
    process.exit(1);
  }

  const configPath = join(ROOT, 'astro.config.mjs');
  const config = await loadAstroConfig();
  const ownHost = config.site ? new URL(config.site).host : null;

  const pages = await collect(DIST, ['.html']);
  const sheets = await collect(DIST, ['.css']);

  console.log(`Garde-fous de conception — ${pages.length} page(s), ${sheets.length} feuille(s)\n`);

  let failures = 0;
  failures += report(
    'Aucun script ni style inline',
    pages.flatMap(({ path, content }) => checkNoInline(path, content))
  );
  failures += report('Aucune ressource tierce', [
    ...pages.flatMap(({ path, content }) => checkNoThirdPartyHtml(path, content, ownHost)),
    ...sheets.flatMap(({ path, content }) => checkNoThirdPartyCss(path, content, ownHost)),
  ]);
  failures += report("inlineStylesheets: 'never'", checkInlineStylesheets(configPath, config));

  if (failures > 0) {
    console.error(
      `\n${failures} violation(s). Ces contraintes tiennent la CSP default-src 'none' ;` +
        ' voir README.md, « Contraintes à ne pas casser ».'
    );
    process.exit(1);
  }
  console.log('\nTout est conforme.');
}

await main();
