# Le système visuel

Le site est une étoffe. Ce n'est pas une métaphore décorative : c'est ce qui décide
de la palette, de la grille et des transitions entre zones. Lire cette page avant de
toucher à `src/styles/global.css`.

## D'où vient la forme

Trois idées se recoupent, et c'est leur recoupement qui tient lieu de direction.

**La bande tissée.** Le tissage ewe (Notsé, Kpalimé) procède par bandes étroites
tissées séparément, puis cousues bord à bord. Les motifs ne s'alignent pas d'une bande
à l'autre — le décalage est le savoir-faire, pas un défaut. D'où les trois lés de
largeurs inégales et de départs décalés du parcours en page d'accueil (`.strips`), et
les cinq segments hors phase du seuil (`.seuil`).

**Le fukinsei.** L'asymétrie délibérée, et l'intervalle qui porte autant que la
matière. D'où le fer à gauche partout, les marges larges, et le refus des grilles
centrées ou de colonnes égales.

**L'indigo.** Teinture partagée par les deux traditions — *aizome* au Japon, indigo
ouest-africain sur coton. Le site est teint là où il affirme, coton brut là où il se
lit. La frontière entre les deux est franche : c'est le seuil, jamais un filet.

## Les pigments

| Jeton | Valeur | Emploi |
|---|---|---|
| `--indigo` | `#16283c` | Le champ teint : hero, bandes d'affirmation |
| `--indigo-deep` | `#0d1a28` | Deux fois teint : rail, blocs de code, bande finale |
| `--cotton` | `#eae8e1` | Coton brut, écru froid — jamais crème |
| `--cotton-fold` | `#dedbd2` | Un pli dans l'étoffe : survol d'une entrée |
| `--saffron` / `--saffron-ink` | `#d4a23c` / `#7a5410` | Le fil. **Seul accent interactif**, deux tons selon le fond |
| `--shu` | `#b3351f` | Le sceau, et **rien d'autre sur tout le site** |

L'encre sur le coton est l'indigo lui-même : pas de noir, pas de gris foncé neutre.

Tous les couples texte/fond tiennent AA (le plus serré est `--on-cotton-quiet` sur
coton, à 5,2:1). Changer un pigment demande de refaire ce calcul.

## Les caractères

Deux familles, servies depuis `public/fonts/`.

- **Newsreader** porte la voix : titre d'ouverture, titres d'articles, corps de texte.
  Son italique sert les incises, jamais la mise en relief.
- **Archivo** porte la structure : navigation, dates, libellés, titres de niveau trois.
  Son **axe de largeur** est la signature du site — même fil, tensions différentes :
  `wdth 85` sur le rail vertical, `wdth 92` pour les méta, `wdth 112` pour la navigation.

Pas de majuscules espacées, pas de monospace pour les petits libellés.

## Le sceau

Marque d'auteur, pas ornement. Un carré aux bords irréguliers, `PL` réservé en coton.
Il apparaît trois fois : bas du rail vertical, pied de page, et `public/favicon.svg`,
d'où dérivent aussi `favicon.ico` et `apple-touch-icon.png`.

Pour régénérer les icônes matricielles à partir du SVG :

```sh
node -e "require('sharp')('public/favicon.svg').resize(180,180).png().toFile('public/apple-touch-icon.png')"
```

## L'image de partage

`public/og.png` est dessinée à la main, pas au build : la rasteriser demanderait de
rendre du texte dans les polices du site, ce qu'aucune bibliothèque Node ne fait
proprement sans les installer sur le système. Elle a été tracée dans un canvas de
navigateur, qui a les polices déjà chargées, puis exportée en PNG 1200×630.

Si le texte doit changer, le plus simple est de refaire ce chemin : une page locale qui
déclare les `@font-face` du site, trace la carte dans un `<canvas>`, et exporte via
`toDataURL('image/png')`.

## Le mouvement

**Une seule orchestration, au chargement du hero** (`@keyframes settle`) : le titre, le
chapeau et les trois lés se posent en séquence, comme une étoffe qu'on laisse retomber.
Tout le reste du site ne bouge qu'en réponse à un geste — survol, focus.

Ne pas ajouter de révélation au défilement. Le tout est sous
`@media (prefers-reduced-motion: no-preference)`.

## Ce qu'on ne fait pas

Le site doit se lire comme écrit à la main, pas généré. Sont exclus par principe :
crème et terracotta, noir avec un accent vert acide, cartes arrondies identiques à
répétition, libellés en majuscules espacées au-dessus des titres, méta jointes par des
points médians, « → » collé au texte des liens, monospace pour les petits libellés, un
seul mot du titre mis en couleur.
