# Le système visuel

Le site est une étoffe cousue en bandes, et une enveloppe. Ce n'est pas une métaphore
décorative : c'est ce qui décide de la palette, de la grille et du découpage des pages.
Lire cette page avant de toucher à `src/styles/global.css`.

## D'où vient la forme

Trois idées se recoupent, et c'est leur recoupement qui tient lieu de direction.

**La bande kente.** Le tissage éwé (Notsé, Kpalimé) procède par bandes étroites, à peine
une main de large, tissées séparément puis cousues bord à bord. Les motifs ne s'alignent
pas d'une bande à l'autre — le décalage est le savoir-faire, pas un défaut. D'où les cinq
lés hors phase de l'ouverture (`.etoffe`), les lisières cousues entre les zones
(`.lisiere`), et les trois bandes de lieu de la section Racines (`.lieu`).

**Le colombage.** La première bande est alsacienne : croisillons de la Petite France,
grès rose de la cathédrale. Elle est tissée comme les autres, mais son motif vient d'un
mur à pans de bois. C'est le métissage dit en une bande, pas en une phrase.

**La poste.** Le parcours ne se lit pas en colonnes mais en timbres numérotés, chacun
avec sa dentelure, sa vignette et son cachet d'oblitération. Un quatrième cadre reste
vide : le prochain timbre, à émettre. Les étiquettes, les dates et les cachets sont en
machine à écrire, comme au guichet.

## Les pigments

Les huit teintes de la planche, plus les teintes de service qu'elle nomme dans ses notes.
Elles sont déclarées une fois dans `:root` et ne portent **aucune** sémantique : ce sont
des pigments, pas des rôles.

| Jeton | Valeur | Emploi |
|---|---|---|
| `--kaolin` | `#f1e7d3` | Le fond. Terre blanche, jamais blanc papier |
| `--ebene` | `#201812` | L'encre, et le fond des nappes de nuit |
| `--laterite` | `#9e3f24` | L'accent sur kaolin : salutation, un mot du titre, focus |
| `--ocre` | `#c98b22` | Le fil. L'accent sur ébène |
| `--vert` | `#1f5a3c` | Drapeau togolais, dans les motifs et la bande de pied |
| `--jaune` | `#f0c21c` | Drapeau togolais. **Ne porte jamais de texte** |
| `--indigo` | `#22304a` | Le ciel d'hiver : bande de Montréal, vignette du N° 1 |
| `--gres-rose` | `#b86e5c` | Strasbourg. **Décoratif seulement** — 3,16:1 sur kaolin |
| `--papier` | `#fffbf2` | Le papier du timbre, plus clair que le fond |
| `--encre-douce` | `#5e5246` | Texte courant et méta sur kaolin |
| `--sur-ebene` | `#b9a992` | Texte courant et méta sur ébène |
| `--filet-clair` / `--filet-sombre` | `#d5c6aa` / `#4a3d31` | Séparateurs, selon la surface |
| `--bois` | `#3a2a1e` | Les pans de bois du colombage |
| `--platre` | `#f4e9dd` | L'enduit entre les pans de bois |
| `--indigo-clair` | `#2d3e5e` | Le ciel rayé de la vignette du N° 1 |
| `--abricot` | `#e59a6e` | La marque « brouillon » sur ébène |
| `--sourdine` / `--paille` / `--pousse` | `#9a8d7c` / `#e8c687` / `#9ec9ae` | Commentaires, chaînes et lignes ajoutées dans un bloc de code |

Un jeton de plus n'est pas une teinte : `--grain` porte la trame horizontale que les
six motifs superposent. Il est dans `:root` pour la même raison — une seule déclaration.

**Aucune teinte n'est écrite en dur ailleurs que dans ce bloc.** Si une valeur manque,
c'est un jeton à ajouter ici, pas un hexadécimal à poser dans une règle.

### Les surfaces, et pourquoi les composants n'ont pas de couleur

Une **nappe** est une surface teinte. Elle ne pose pas des couleurs sur ses enfants : elle
re-pointe des jetons sémantiques — `--fond`, `--encre`, `--encre-calme`, `--filet`,
`--accent`, `--signal`. `.nappe` les fait pointer vers le kaolin, `.nappe--nuit` vers
l'ébène.

Conséquence : un composant s'écrit **une fois** et fonctionne sur les deux surfaces. La
liste d'écrits (`.piece`) est sur ébène en accueil et sur kaolin dans `/ecrits/`, sans une
seule règle de variante. L'anneau de focus suit : latérite sur kaolin, ocre sur ébène,
parce qu'il vaut `var(--accent)`.

**Ajouter une couleur en dur dans un composant casse cette propriété.** Si une teinte
manque, c'est un jeton de surface qu'il faut ajouter, pas une exception.

### Les contrastes

Tous les couples texte/fond réellement employés tiennent AA. Recalculer ce tableau avant
de changer un pigment — c'est une contrainte, pas une indication.

| Couple | Emploi | Contraste |
|---|---|---|
| ébène sur kaolin | titres, texte fort | 14,25:1 |
| encre douce sur kaolin | texte courant, méta | 6,17:1 |
| latérite sur kaolin | accent, salutation, anneau de focus | 5,36:1 |
| ébène sur papier | texte du timbre | 16,93:1 |
| encre douce sur papier | enjeu du timbre | 7,34:1 |
| kaolin sur ébène | titres et liens de la nappe de nuit | 14,25:1 |
| sur-ébène sur ébène | texte courant et méta de la nappe de nuit | 7,62:1 |
| ocre sur ébène | accent, anneau de focus de la nappe de nuit | 6,00:1 |
| abricot sur ébène | marque « brouillon » | 7,64:1 |
| commentaire Prism sur ébène | bloc de code | 5,39:1 |
| chaîne Prism sur ébène | bloc de code | 10,71:1 |

Et ce qui **échoue**, donc n'est jamais du texte : grès rose sur kaolin (3,16:1), latérite
sur ébène (2,66:1), ocre sur kaolin (2,38:1), jaune sur kaolin (1,38:1), ébène sur
latérite (2,66:1). Chacune de ces teintes a une surface où elle passe : l'accent change avec
la nappe au lieu d'être forcé.

## Les caractères

Trois familles, servies depuis `public/fonts/`.

- **Zilla Slab** affiche : titres en 700, titres de liste en 500, un italique 500 pour le
  timbre à émettre. L'empattement carré des caractères en bois d'affiche.
- **Literata** se lit : texte courant en 400, renforts en 600, italique pour les incises.
- **Courier Prime** étiquette : libellés de section, dates, numéros de timbre, cachets,
  colophon. La machine à écrire du bureau de poste.

La pile `--machine` est `'Courier Prime', 'Literata', ui-monospace, monospace` : Courier
Prime n'a pas le `→`, et Literata est la seule police chargée qui l'a. Le repli ne porte
que ce caractère.

### Fabriquer les fichiers

Les trois familles sont sous licence [SIL OFL 1.1](https://openfontlicense.org), tirées de
`github.com/google/fonts` (`ofl/zillaslab`, `ofl/literata`, `ofl/courierprime`). Les woff2
servis **ne sont pas** des sous-ensembles Google standards : deux écarts assumés.

**Literata est instanciée.** La police amont varie sur `opsz` (7–72) et `wght` (200–900) ;
sa table `gvar` pèse 550 Ko à elle seule. On épingle `opsz=14` — le corps du site tourne
autour de 17 px — et on réduit `wght` à ce que la direction emploie (400–600 en romain,
400 en italique). Le fichier passe de 235 Ko à 75 Ko.

**Le `ɔ` est ajouté.** `Woezɔ` (éwé) a besoin de U+0254, que **ni** Zilla Slab, **ni**
Literata, **ni** Courier Prime ne contiennent. Sans lui, la salutation d'ouverture change
de police en plein mot, en silence et différemment selon le système. Le caractère est
historiquement un `c` retourné : on l'ajoute à Courier Prime en glyphe **composite** qui
référence `c` avec une symétrie horizontale, plutôt que de redessiner un contour — il
suit ainsi toute retouche de `c` et garde son chasse.

La plage de sous-ensemblage est l'union des sous-ensembles Google `latin` et `latin-ext`,
**plus `U+2190-2193`** : le `latin` de Google contient `↑` et `↓` mais pas `→`.

Aucune des trois familles ne déclare de *Reserved Font Name* dans son `OFL.txt` amont :
ajouter un glyphe à Courier Prime et le servir sous son nom est conforme.

#### La recette

`fontTools` n'est **pas** une dépendance du projet — refaire les polices est une opération
manuelle, rare, hors du build. D'où un environnement jetable :

```sh
python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools brotli
```

Les sources, depuis `https://raw.githubusercontent.com/google/fonts/main/` :
`ofl/zillaslab/ZillaSlab-{Medium,Bold,MediumItalic}.ttf`,
`ofl/literata/Literata[opsz,wght].ttf`, `ofl/literata/Literata-Italic[opsz,wght].ttf`,
`ofl/courierprime/CourierPrime-{Regular,Bold}.ttf`.

Literata se réduit d'abord à ce que la direction emploie :

```sh
/tmp/fontenv/bin/python -m fontTools.varLib.instancer -o Literata-site.ttf Literata.ttf wght=400:600 opsz=14
```

Le `ɔ` s'ajoute aux deux Courier Prime en glyphe composite — `uni0254` référence `c` avec
la transformation `[[-1, 0], [0, 1]]` et le décalage `xMin + xMax`, ce qui le met en
miroir sans le déplacer ; `hmtx['uni0254'] = hmtx['c']`, et `0x0254` entre dans la table
`cmap` Unicode. Puis chaque fichier passe au sous-ensemblage :

```sh
/tmp/fontenv/bin/pyftsubset <src>.ttf --output-file=<nom>.woff2 --flavor=woff2 --layout-features='*' --no-hinting --drop-tables+=DSIG --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD,U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF"
```

Après coup, vérifier que chaque fichier commence bien par `wOF2` et que sa `cmap` couvre
`ɔ`, `→` et les accents français. Un fichier manquant ou mal nommé est rattrapé par le
garde-fou « toute ressource locale référencée existe » ; un **glyphe** manquant, non.

## Les motifs

Tous en CSS pur ou en SVG inline. **Aucune image matricielle, aucune URI `data:`** — la
CSP de production n'ouvre pas `img-src data:`, et le garde-fou refuse les deux.

| Motif | Technique | Où |
|---|---|---|
| Bandes cousues | trois `repeating-linear-gradient` par bande : fils de chaîne, blocs de trame, grain | `.lisiere`, `.etoffe`, `.lieu` |
| Dentelure de timbre | `radial-gradient` répété, `background-position` négatif pour que les trous mordent le bord | `.timbre` |
| Cachet d'oblitération | SVG inline : deux cercles, `<textPath>` sur un arc, barres d'annulation | `.cachet` |
| Damier-monogramme | `conic-gradient` à quatre quartiers, `background-size: 50%`, `outline` décalé | `.monogramme` |
| Bande de pied | canton latérite avec étoile SVG, puis cinq bandes vert/jaune | `.bande-pied` |
| Colombage | deux `linear-gradient` diagonaux (croix de Saint-André) et deux orthogonaux (poteaux, sablières) | `.lieu--strasbourg` |

Trois contraintes qui mordent :

- **Pas de variable CSS inline.** Un motif qui change d'un timbre à l'autre passe par une
  classe (`.timbre--air`), jamais par `style={...}` ni `define:vars` : les deux posent un
  `style=""` ou un `<style>` dans le HTML, que `scripts/check-constraints.mjs` refuse.
- **Le cachet chevauche le bord droit du timbre.** L'anneau et son texte se lisent sur le
  kaolin, les barres d'annulation partent dans la gouttière. Le timbre qui le porte monte
  d'un cran (`.timbre:has(.cachet)`), sans quoi le timbre suivant — frère positionné, donc
  peint après — recouvrirait les barres. `.timbres` est en `overflow-x: clip` pour contenir
  ce débord sur un écran étroit : `clip` et non `hidden`, qui ouvrirait un conteneur de
  défilement et ramènerait une barre horizontale à 375 px.
- **Les bandes de lieu se mesurent en `vw`, pas en `rem`.** Trois bandes de `6rem`
  débordent hors d'un écran de 375 px dès que le lecteur passe le zoom texte à 200 %, et
  aucun `clip` ne protège la page elle-même.

## La marque

Le damier-monogramme remplace le sceau de la direction précédente : un carré de trame,
sans lettres. Dans l'en-tête (`.monogramme`), le `conic-gradient` à quatre quartiers est
tuilé en `background-size: 50%`, ce qui donne un damier de seize carreaux. Dans
`public/favicon.svg`, c'est le **même motif réduit à un seul quartier de quatre carreaux** :
seize carreaux ne se distinguent pas à 16 px. L'icône d'application en dérive :

```sh
node -e "require('sharp')('public/favicon.svg',{density:600}).resize(180,180).png().toFile('public/apple-touch-icon.png')"
```

### Le `.ico`

`public/favicon.ico` est le repli de `<link rel="alternate icon">`, pour les clients qui
ne lisent pas le SVG. Aucune dépendance du projet n'écrit ce format — `sharp` ne sait ni
le lire ni l'écrire — et en ajouter une pour trois rectangles n'en vaut pas le prix.
`scripts/make-favicon.mjs` le grave donc sans dépendance, en 16, 32 et 48 :

```sh
node scripts/make-favicon.mjs
```

Le script reprend la géométrie de `public/favicon.svg`, qui fait foi, dans le même repère
100×100. Deux choix à ne pas défaire sans raison :

- **Les bords sont arrêtés sur la grille de pixels, taille par taille, au lieu d'être
  lissés.** À 16 px le cadre mesure 0,96 px de large : lissé, il se dilue en un halo et le
  damier perd ses arêtes. C'est la même raison qui réduit le favicon à quatre carreaux
  quand l'en-tête en affiche seize.
- **Les images sont des bitmaps DIB 32 bits, pas des PNG embarqués.** Le PNG dans un `.ico`
  tiendrait en 1 Ko au lieu de 15, mais le `.ico` n'existe précisément que pour les clients
  anciens — l'économie se paierait sur ceux à qui le fichier est destiné.

Après coup, `file public/favicon.ico` doit annoncer trois icônes.

## L'image de partage

`public/og.png` (1200×630) porte du texte dans les polices du site. La rasteriser depuis
Node demanderait de les installer sur le système, ce qu'on ne fait pas pour une image qui
change deux fois par an. On passe donc par un navigateur, qui sait composer du texte :

```sh
node scripts/make-og.mjs   # puis ouvrir http://localhost:4330/
```

`scripts/make-og.mjs` sert `scripts/og-card.html` et les woff2 de `public/fonts/`. La page
attend `document.fonts.ready`, trace la carte dans un `<canvas>`, la renvoie en POST, et le
serveur écrit `public/og.png` puis s'arrête — rien à copier à la main. Le canvas reste
affiché : ce qu'on voit est le fichier écrit.

La carte reprend l'ouverture : fond kaolin, bande tissée en tête et en pied (le motif de
`.lisiere--tete`, grain compris), le damier à seize carreaux de l'en-tête, la déclaration
en Zilla Slab 700 avec `ni moi.` en latérite — en couleur et non en italique, comme
`.declaration em` —, les trois segments de fil, et le chapeau en Literata.

Le rythme vertical est posé en constantes de lignes de base plutôt que cumulé au fil du
tracé : la dernière ligne du chapeau passe à 36 px de la bande de pied, et une dérive de
quelques pixels l'y ferait entrer. Changer le texte demande donc de regarder le canvas, pas
seulement de relancer.

Les teintes sont écrites en dur dans la page — c'est le seul endroit du dépôt où c'est
permis, puisqu'un canvas ne lit pas `:root`. Elles doivent suivre les jetons à la main.

## Le mouvement

**Une seule orchestration, au chargement de l'ouverture** (`@keyframes poser`) : la
salutation, le titre, le fil, le chapeau et l'aparté se posent en séquence, comme un lé
qu'on laisse retomber. Tout le reste du site ne bouge qu'en réponse à un geste — survol,
focus.

Ne pas ajouter de révélation au défilement. Le bloc entier est sous
`@media (prefers-reduced-motion: no-preference)` ; c'est la seule déclaration `animation`
de la feuille, et elle doit le rester.

## Ce qu'on ne fait pas

Le site doit se lire comme écrit à la main, pas généré. Sont exclus par principe : les
dégradés de remplissage, les cartes arrondies identiques à répétition, les pastilles de
liste, les images matricielles dans les motifs, les libellés en majuscules espacées
au-dessus des titres, une couleur de texte posée dans un composant au lieu d'un jeton de
surface.

**Trois choses que la direction précédente interdisait et que celle-ci fait, délibérément** :
le monospace porte les petits libellés (c'est le guichet de poste, pas un défaut de goût) ;
un mot du titre est mis en couleur (`ni moi.` en latérite) ; et « Tous les écrits → » colle
une flèche au texte du lien. Les trois viennent de la planche. Ne pas les « corriger » sans
reprendre la planche.
