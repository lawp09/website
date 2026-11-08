/**
 * Tests des garde-fous de conception.
 *
 * Ces contrôles sont le seul filet du dépôt : ils tiennent, depuis ici, une CSP
 * écrite dans un autre dépôt. Une régression silencieuse de leur logique ne se
 * verrait nulle part — d'où ces tests, en `node --test`, sans dépendance.
 *
 * Usage : npm test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkNoInline,
  checkNoThirdPartyHtml,
  checkNoThirdPartyCss,
  checkNoDataUris,
  checkLocalResourcesExist,
  checkCustomProperties,
  declaredCustomProperties,
  checkInlineStylesheets,
} from './check-constraints.mjs';

const HOTE = 'philippelawson.net';

/** Les ressources de `dist/` dans un cas de test : tout le reste est absent. */
const presents = new Set([
  '/fonts/literata.woff2',
  '/fonts/a b.woff2',
  '/_astro/feuille.css',
  '/og.png',
  '/ecrits/zero/photo.png',
  '/ecrits/index.html',
]);
const existe = (chemin) => presents.has(chemin);

const localesHtml = (contenu, depuis = '/index.html') =>
  checkLocalResourcesExist('p.html', contenu, HOTE, 'html', depuis, existe);
const localesCss = (contenu, depuis = '/_astro/feuille.css') =>
  checkLocalResourcesExist('f.css', contenu, HOTE, 'css', depuis, existe);

// ---------------------------------------------------------------------------
// Aucun script ni style inline
// ---------------------------------------------------------------------------

test('checkNoInline laisse passer une page sans script ni style', () => {
  assert.deepEqual(checkNoInline('p.html', '<p>Du texte, un <a href="/x/">lien</a>.</p>'), []);
});

test('checkNoInline refuse balises, attribut style, gestionnaire et javascript:', () => {
  const cas = [
    '<script>alert(1)</script>',
    '<style>p{color:red}</style>',
    '<p style="color:red">x</p>',
    '<button onclick="go()">x</button>',
    '<a href="javascript:go()">x</a>',
  ];
  for (const html of cas) {
    assert.equal(checkNoInline('p.html', html).length >= 1, true, html);
  }
});

test('checkNoInline ne confond pas un mot du texte avec un gestionnaire', () => {
  assert.deepEqual(checkNoInline('p.html', '<p>on a dit « non » : one = 1</p>'), []);
});

// ---------------------------------------------------------------------------
// Aucune ressource tierce
// ---------------------------------------------------------------------------

test('checkNoThirdPartyHtml refuse une feuille distante', () => {
  const html = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X">';
  assert.equal(checkNoThirdPartyHtml('p.html', html, HOTE).length, 1);
});

test('checkNoThirdPartyHtml laisse passer un lien de texte vers l’extérieur', () => {
  const html = '<a href="https://example.com/article">un article</a>';
  assert.deepEqual(checkNoThirdPartyHtml('p.html', html, HOTE), []);
});

test('checkNoThirdPartyHtml laisse passer un rel déclaratif distant', () => {
  const html = '<link rel="canonical" href="https://philippelawson.net/x/">';
  assert.deepEqual(checkNoThirdPartyHtml('p.html', html, HOTE), []);
});

test('checkNoThirdPartyHtml refuse une ressource en protocole relatif', () => {
  assert.equal(checkNoThirdPartyHtml('p.html', '<img src="//cdn.x/y.png">', HOTE).length, 1);
});

test('checkNoThirdPartyHtml déplie srcset', () => {
  const html = '<img srcset="/a.png 1x, https://cdn.x/b.png 2x">';
  assert.equal(checkNoThirdPartyHtml('p.html', html, HOTE).length, 1);
});

test('checkNoThirdPartyHtml refuse un <use> SVG distant, href et xlink:href', () => {
  assert.equal(checkNoThirdPartyHtml('p.html', '<use href="https://cdn.x/s.svg#a"/>', HOTE).length, 1);
  assert.equal(
    checkNoThirdPartyHtml('p.html', '<use xlink:href="https://cdn.x/s.svg#a"/>', HOTE).length,
    1
  );
});

test('checkNoThirdPartyHtml reconnaît feImage quelle que soit la casse', () => {
  assert.equal(checkNoThirdPartyHtml('p.html', '<feImage href="https://cdn.x/a.png"/>', HOTE).length, 1);
});

test('checkNoThirdPartyCss refuse une police distante', () => {
  const css = "@font-face{src:url('https://fonts.gstatic.com/s/a.woff2')}";
  assert.equal(checkNoThirdPartyCss('f.css', css, HOTE).length, 1);
});

test('checkNoThirdPartyCss laisse passer une police locale', () => {
  assert.deepEqual(checkNoThirdPartyCss('f.css', "src:url('/fonts/literata.woff2')", HOTE), []);
});

// ---------------------------------------------------------------------------
// Aucune ressource embarquée en data:
// ---------------------------------------------------------------------------

test('checkNoDataUris refuse une image embarquée, en HTML comme en CSS', () => {
  assert.equal(checkNoDataUris('p.html', '<img src="data:image/png;base64,iVBOR">', 'html').length, 1);
  assert.equal(checkNoDataUris('f.css', 'background:url(data:image/svg+xml,%3Csvg/%3E)', 'css').length, 1);
});

test('checkNoDataUris refuse un <use> SVG embarqué et un data: dans srcset', () => {
  assert.equal(checkNoDataUris('p.html', '<use href="data:image/svg+xml,%3Csvg/%3E"/>', 'html').length, 1);
  assert.equal(checkNoDataUris('p.html', '<img srcset="/a.png 1x, data:image/png;base64,iV 2x">', 'html').length, 1);
});

test('checkNoThirdPartyCss refuse un @import distant', () => {
  assert.equal(checkNoThirdPartyCss('f.css', "@import url('https://cdn.x/a.css');", HOTE).length >= 1, true);
});

test('checkNoDataUris laisse passer une ressource locale', () => {
  assert.deepEqual(checkNoDataUris('p.html', '<img src="/og.png">', 'html'), []);
});

// ---------------------------------------------------------------------------
// Toute ressource locale référencée existe
// ---------------------------------------------------------------------------

test('une police servie qui existe passe', () => {
  const html = '<link rel="preload" href="/fonts/literata.woff2" as="font">';
  assert.deepEqual(localesHtml(html), []);
});

test('une police servie qui n’existe pas échoue', () => {
  const html = '<link rel="preload" href="/fonts/literataa.woff2" as="font">';
  assert.equal(localesHtml(html).length, 1);
});

test('une URL relative se résout depuis le fichier qui la porte', () => {
  assert.deepEqual(localesCss('src:url(../fonts/literata.woff2)'), []);
  assert.equal(localesCss('src:url(../fonts/absente.woff2)').length, 1);
});

test('une URL relative dans une page profonde se résout depuis son dossier', () => {
  const html = '<img src="photo.png">';
  assert.deepEqual(localesHtml(html, '/ecrits/zero/index.html'), []);
  assert.equal(localesHtml('<img src="autre.png">', '/ecrits/zero/index.html').length, 1);
});

test('une URL absolue sur l’hôte du site est contrôlée', () => {
  assert.deepEqual(localesHtml('<img src="https://philippelawson.net/og.png">'), []);
  assert.equal(localesHtml('<img src="https://philippelawson.net/absent.png">').length, 1);
});

test('un hôte tiers sort du périmètre : c’est l’autre contrôle qui le prend', () => {
  assert.deepEqual(localesHtml('<img src="https://cdn.example/x.png">'), []);
});

test('ancre, mailto: et data: ne désignent aucun fichier', () => {
  assert.deepEqual(localesHtml('<svg><use href="#monogramme"/></svg>'), []);
  assert.deepEqual(localesHtml('<a href="mailto:x@y.z">écrire</a>'), []);
  assert.deepEqual(localesHtml('<img src="data:image/png;base64,iVBOR">'), []);
});

test('un href de navigation n’est pas une ressource', () => {
  assert.deepEqual(localesHtml('<a href="/page-absente/">lien</a>'), []);
});

test('un chemin terminé par / vise son index.html', () => {
  assert.deepEqual(localesHtml('<link rel="preload" href="/ecrits/" as="document">'), []);
  assert.equal(localesHtml('<link rel="preload" href="/outils/" as="document">').length, 1);
});

test('le pourcent-encodage est résolu avant comparaison', () => {
  assert.deepEqual(localesHtml('<link rel="preload" href="/fonts/a%20b.woff2" as="font">'), []);
});

test('une query ou un fragment ne fait pas partie du chemin', () => {
  assert.deepEqual(localesHtml('<img src="/og.png?v=2">'), []);
  assert.deepEqual(localesHtml('<img src="/og.png#haut">'), []);
});

test('un href de <use> SVG vers un fichier absent échoue', () => {
  assert.equal(localesHtml('<svg><use href="/sprite.svg#x"/></svg>').length, 1);
});

// ---------------------------------------------------------------------------
// Toute propriété personnalisée résout
// ---------------------------------------------------------------------------

/** Les propriétés d'une feuille servent de référentiel à elle-même. */
const proprietes = (css) => checkCustomProperties('f.css', css, declaredCustomProperties(css));

test('une feuille dont les jetons résolvent passe', () => {
  assert.deepEqual(proprietes(':root{--ocre:#c98b22}.x{color:var(--ocre)}'), []);
});

test('un jeton qui se référence lui-même est refusé', () => {
  // Le cas réel : un remplacement en masse qui frappe aussi la déclaration.
  const v = proprietes(':root{--ocre:var(--ocre)}.x{color:var(--ocre)}');
  assert.equal(v.length, 1);
  assert.match(v[0].detail, /--ocre se référence elle-même/);
});

test('un jeton jamais déclaré est refusé', () => {
  const v = proprietes(':root{--ocre:#c98b22}.x{color:var(--ocer)}');
  assert.equal(v.length, 1);
  assert.match(v[0].detail, /--ocer n’est déclarée nulle part|--ocer n'est déclarée nulle part/);
});

test('un préfixe commun n’est pas une auto-référence', () => {
  // `--filet: var(--filet-clair)` est légitime : le trait d'union compte comme
  // frontière de mot, donc un `\b` naïf le prendrait pour une auto-référence.
  assert.deepEqual(
    proprietes(':root{--filet-clair:#d5c6aa}.n{--filet:var(--filet-clair);border-color:var(--filet)}'),
    []
  );
});

test('un var() avec repli reste valide sans déclaration', () => {
  assert.deepEqual(proprietes('.x{color:var(--jamais-declare, #000)}'), []);
});

test('une propriété déclarée dans une autre feuille compte comme déclarée', () => {
  const declared = declaredCustomProperties(':root{--ocre:#c98b22}');
  assert.deepEqual(checkCustomProperties('b.css', '.x{color:var(--ocre)}', declared), []);
});

// ---------------------------------------------------------------------------
// inlineStylesheets
// ---------------------------------------------------------------------------

test('checkInlineStylesheets exige never', () => {
  assert.deepEqual(checkInlineStylesheets('c.mjs', { build: { inlineStylesheets: 'never' } }), []);
  assert.equal(checkInlineStylesheets('c.mjs', { build: { inlineStylesheets: 'auto' } }).length, 1);
  assert.equal(checkInlineStylesheets('c.mjs', {}).length, 1);
});
