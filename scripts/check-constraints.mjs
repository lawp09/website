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

import { realpathSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, posix, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

/**
 * Éléments dont le `href` charge un fichier au lieu de désigner une
 * destination. En SVG, `<use>`, `<image>` et `<feImage>` tirent un fichier —
 * `<a href>` non, et c'est toute la différence.
 */
const FETCHING_HREF_TAGS = new Set(['use', 'image', 'feimage']);

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
  const pattern = /([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
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
  { pattern: /\son[a-z]+\s*=\s*["']/gi, label: 'gestionnaire inline on…=""' },
  { pattern: /["'(]\s*javascript:/gi, label: 'URL javascript:' },
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

/**
 * Les ressources qu'une page demande au navigateur, une par URL.
 *
 * Un `<a href>` vers l'extérieur dans le corps d'un texte est légitime : il ne
 * charge rien, c'est le lecteur qui décide de le suivre. Seuls les attributs
 * qui provoquent une requête, et le `href` d'un `<link>` non déclaratif
 * (stylesheet, preload, preconnect…), sont rendus ici.
 */
function* resourcesOfHtml(content) {
  for (const tag of content.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
    const [, tagName, rawAttrs] = tag;
    const name = tagName.toLowerCase();
    const attrs = parseAttrs(rawAttrs);
    const line = lineAt(content, tag.index);
    const rel = (attrs.get('rel') ?? '').toLowerCase();

    for (const [attr, value] of attrs) {
      const fetchesResource =
        FETCHING_ATTRS.has(attr) ||
        (name === 'link' && attr === 'href' && !DECLARATIVE_RELS.has(rel)) ||
        (FETCHING_HREF_TAGS.has(name) && (attr === 'href' || attr === 'xlink:href'));
      if (!fetchesResource) continue;

      for (const url of urlsOf(attr, value)) {
        yield { line, url, detail: `<${name} ${attr}="${url}">` };
      }
    }
  }
}

/** Les ressources qu'une feuille de style demande (polices, imports, images). */
function* resourcesOfCss(content) {
  const patterns = [
    /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi,
    /@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      yield { line: lineAt(content, match.index), url: match[1], detail: match[0].trim() };
    }
  }
}

const RESOURCES_OF = { html: resourcesOfHtml, css: resourcesOfCss };

function thirdParties(file, content, ownHost, flavour) {
  const violations = [];
  for (const { line, url, detail } of RESOURCES_OF[flavour](content)) {
    if (isExternal(url, ownHost)) violations.push({ file, line, detail });
  }
  return violations;
}

/** Aucune ressource tierce chargée par une page. */
export function checkNoThirdPartyHtml(file, content, ownHost) {
  return thirdParties(file, content, ownHost, 'html');
}

/** Aucune ressource tierce chargée par une feuille de style (polices, imports). */
export function checkNoThirdPartyCss(file, content, ownHost) {
  return thirdParties(file, content, ownHost, 'css');
}

/**
 * Aucune ressource embarquée en `data:`.
 *
 * La CSP de production n'ouvre pas `img-src data:`, et `isExternal` laisse
 * passer ces URI puisqu'elles ne visent aucun hôte. Vite inline en base64 les
 * petits fichiers référencés depuis `src/` (`assetsInlineLimit`, 4 Ko par
 * défaut) : sans ce contrôle, ajouter une petite image casserait la page en
 * production sans rien casser ici.
 */
export function checkNoDataUris(file, content, flavour) {
  const violations = [];
  for (const { line, url, detail } of RESOURCES_OF[flavour](content)) {
    if (/^\s*data:/i.test(url)) {
      violations.push({ file, line, detail: `${detail.slice(0, 50)}… — URI data:` });
    }
  }
  return violations;
}

/**
 * Le chemin servi que désigne une URL locale, ou `null` si l'URL ne désigne
 * pas un fichier de ce site (ressource tierce, `data:`, `mailto:`, ancre).
 * `from` est le chemin servi du fichier qui porte la référence, ce qui permet
 * de résoudre une URL relative.
 */
function servedPath(url, ownHost, from) {
  const value = url.trim();
  if (value === '' || value.startsWith('#')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:/i.test(value)) return null;

  let pathname;
  if (/^https?:\/\//i.test(value) || value.startsWith('//')) {
    try {
      const parsed = new URL(value.startsWith('//') ? `https:${value}` : value);
      if (parsed.host !== ownHost) return null;
      pathname = parsed.pathname;
    } catch {
      return null;
    }
  } else {
    const [bare] = value.split(/[?#]/);
    pathname = bare.startsWith('/') ? bare : posix.join(posix.dirname(from), bare);
  }

  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  return pathname.endsWith('/') ? `${pathname}index.html` : pathname;
}

/**
 * Toute ressource locale que la sortie référence existe bien dans la sortie.
 *
 * Une police renommée ou un chemin mal tapé ne casse ni le build ni les autres
 * contrôles : le navigateur prend un 404 en silence et retombe sur une police
 * système. `exists` est injecté (chemin servi → booléen) pour que ce contrôle
 * reste une fonction pure, testable sans toucher au disque.
 */
export function checkLocalResourcesExist(file, content, ownHost, flavour, from, exists) {
  const violations = [];
  for (const { line, url, detail } of RESOURCES_OF[flavour](content)) {
    const path = servedPath(url, ownHost, from);
    if (path !== null && !exists(path)) {
      violations.push({ file, line, detail: `${detail} → ${path} absent de dist/` });
    }
  }
  return violations;
}

/** Les propriétés personnalisées qu'une feuille déclare : nom → valeur. */
export function declaredCustomProperties(content) {
  const declared = new Map();
  for (const match of content.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]*)/g)) {
    declared.set(match[1], match[2].trim());
  }
  return declared;
}

/**
 * Toute propriété personnalisée référencée est déclarée, et aucune ne se
 * référence elle-même.
 *
 * Un `var()` qui ne résout pas n'échoue pas tout seul : il rend **toute la
 * déclaration** invalide. Un `background-image` qui superpose trois dégradés
 * disparaît donc en entier, et la page reste « valide » — rien dans le build,
 * le typage ou les autres contrôles ne le signale. Le site n'ayant ni script
 * ni style inline, une propriété ne peut venir que d'une feuille : ce qui n'y
 * est pas déclaré ne sera jamais défini.
 */
export function checkCustomProperties(file, content, declared) {
  const violations = [];
  const local = declaredCustomProperties(content);

  for (const [nom, valeur] of local) {
    // `(?![\w-])` et non `\b` : un trait d'union est une frontière de mot, donc
    // `\b` ferait passer `--filet: var(--filet-clair)` pour une auto-référence.
    if (new RegExp(`var\\(\\s*${nom}(?![\\w-])`).test(valeur)) {
      violations.push({
        file,
        line: lineAt(content, content.indexOf(`${nom}:`)),
        detail: `${nom} se référence elle-même, donc ne vaut rien`,
      });
    }
  }

  for (const match of content.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*([,)])/g)) {
    // `var(--x, repli)` reste valide même si `--x` n'est jamais déclarée.
    if (match[2] === ',') continue;
    if (!declared.has(match[1])) {
      violations.push({
        file,
        line: lineAt(content, match.index),
        detail: `${match[1]} n'est déclarée nulle part`,
      });
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

/** Le chemin servi d'un fichier de `dist/` : `/fonts/literata.woff2`. */
function served(dir, path) {
  return `/${relative(dir, path).split(/[\\/]/).join('/')}`;
}

/** Les fichiers de `dir`, chemin servi compris. */
async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

/** Ceux de `files` dont le nom finit par un des suffixes donnés, lus. */
function collect(dir, files, suffixes) {
  return Promise.all(
    files
      .filter((path) => suffixes.some((suffix) => path.endsWith(suffix)))
      .map(async (path) => ({
        path,
        from: served(dir, path),
        content: await readFile(path, 'utf8'),
      }))
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

  const files = await listFiles(DIST);
  const pages = await collect(DIST, files, ['.html']);
  const sheets = await collect(DIST, files, ['.css']);
  const servedPaths = new Set(files.map((path) => served(DIST, path)));
  const exists = (path) => servedPaths.has(path);

  console.log(
    `Garde-fous de conception — ${pages.length} page(s), ${sheets.length} feuille(s), ` +
      `${files.length} fichier(s)\n`
  );

  let failures = 0;
  failures += report(
    'Aucun script ni style inline',
    pages.flatMap(({ path, content }) => checkNoInline(path, content))
  );
  failures += report('Aucune ressource tierce', [
    ...pages.flatMap(({ path, content }) => checkNoThirdPartyHtml(path, content, ownHost)),
    ...sheets.flatMap(({ path, content }) => checkNoThirdPartyCss(path, content, ownHost)),
  ]);
  failures += report('Aucune ressource embarquée en data:', [
    ...pages.flatMap(({ path, content }) => checkNoDataUris(path, content, 'html')),
    ...sheets.flatMap(({ path, content }) => checkNoDataUris(path, content, 'css')),
  ]);
  failures += report('Toute ressource locale référencée existe', [
    ...pages.flatMap(({ path, content, from }) =>
      checkLocalResourcesExist(path, content, ownHost, 'html', from, exists)
    ),
    ...sheets.flatMap(({ path, content, from }) =>
      checkLocalResourcesExist(path, content, ownHost, 'css', from, exists)
    ),
  ]);
  // Les feuilles se lisent ensemble : une propriété déclarée dans l'une peut
  // légitimement servir dans une autre.
  const declared = new Map(
    sheets.flatMap(({ content }) => [...declaredCustomProperties(content)])
  );
  failures += report(
    'Toute propriété personnalisée résout',
    sheets.flatMap(({ path, content }) => checkCustomProperties(path, content, declared))
  );
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

// Exécuté seulement en ligne de commande : importé, le module n'expose que ses
// contrôles, ce qui les rend testables sans `dist/` ni `process.exit`.
//
// `import.meta.url` passe par realpath, pas `argv[1]` : sans le réaligner, un
// chemin traversant un lien symbolique ferait sortir ce script en code 0 sans
// rien contrôler — le garde-fou deviendrait un no-op vert.
const lanceEnLigneDeCommande =
  process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;

if (lanceEnLigneDeCommande) {
  await main();
}
