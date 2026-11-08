#!/usr/bin/env node
/**
 * Grave `public/favicon.ico` au damier de la direction « Kente ».
 *
 * Le damier est la marque du site : un cadre d'ébène et quatre carreaux. Il est
 * déjà dans `public/favicon.svg`, qui fait foi — ce script en reprend la
 * géométrie dans le même repère 100×100 et la grave en 16, 32 et 48.
 *
 * Aucune dépendance : les formes sont des rectangles alignés sur les axes, et
 * le conteneur ICO se résume à un en-tête et des bitmaps DIB.
 *
 * Les bords sont arrêtés sur la grille de pixels avant d'être peints, taille
 * par taille, plutôt que lissés. À 16 px, le cadre mesure moins d'un pixel de
 * large : lissé, il se dilue en un halo et le damier n'a plus d'arête. C'est la
 * même raison qui réduit le favicon à quatre carreaux quand l'en-tête en
 * affiche seize — voir `docs/design.md`, « La marque ».
 *
 * Usage : node scripts/make-favicon.mjs
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/favicon.ico', import.meta.url));

/** Les tailles gravées dans le fichier, du plus petit au plus grand. */
const SIZES = [16, 32, 48];

const KAOLIN = [0xf1, 0xe7, 0xd3];
const EBENE = [0x20, 0x18, 0x12];
const LATERITE = [0x9e, 0x3f, 0x24];
const OCRE = [0xc9, 0x8b, 0x22];

/**
 * Le damier, en rectangles `[x0, y0, x1, y1, teinte]` peints dans l'ordre, dans
 * le repère 100×100 de `public/favicon.svg`.
 *
 * Le cadre y est un trait de 6 centré sur un rectangle de 84 posé en (8, 8) :
 * il couvre donc 5→95, et son intérieur reprend au kaolin de 11 à 89.
 */
const SHAPES = [
  [0, 0, 100, 100, KAOLIN],
  [5, 5, 95, 95, EBENE],
  [11, 11, 89, 89, KAOLIN],
  [22, 22, 50, 50, EBENE],
  [50, 22, 78, 50, LATERITE],
  [22, 50, 50, 78, OCRE],
  [50, 50, 78, 78, EBENE],
];

/**
 * Rend le damier en BGRA opaque, lignes du bas vers le haut — l'ordre qu'attend
 * un bitmap DIB.
 */
function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  /** Un bord du repère 100×100, arrêté sur la grille de pixels de `size`. */
  const snap = (value) => Math.round((value / 100) * size);

  for (const [x0, y0, x1, y1, [r, g, b]] of SHAPES) {
    for (let y = snap(y0); y < snap(y1); y += 1) {
      // Le DIB se lit du bas vers le haut, l'image se dessine du haut vers le bas.
      const row = size - 1 - y;
      for (let x = snap(x0); x < snap(x1); x += 1) {
        const at = (row * size + x) * 4;
        pixels[at] = b;
        pixels[at + 1] = g;
        pixels[at + 2] = r;
        pixels[at + 3] = 0xff;
      }
    }
  }

  return pixels;
}

/**
 * Une image ICO au format DIB 32 bits : en-tête, pixels, puis le masque
 * monochrome hérité, laissé à zéro puisque l'opacité est déjà dans l'alpha.
 */
function dib(size) {
  const header = Buffer.alloc(40);
  const pixels = render(size);
  // Le masque se compte en lignes de bits arrondies à 4 octets.
  const mask = Buffer.alloc((Math.ceil(size / 32) * 4) * size);

  header.writeUInt32LE(40, 0); // biSize
  header.writeInt32LE(size, 4); // biWidth
  header.writeInt32LE(size * 2, 8); // biHeight : pixels + masque
  header.writeUInt16LE(1, 12); // biPlanes
  header.writeUInt16LE(32, 14); // biBitCount
  header.writeUInt32LE(0, 16); // biCompression : BI_RGB
  header.writeUInt32LE(pixels.length + mask.length, 20); // biSizeImage

  return Buffer.concat([header, pixels, mask]);
}

/** Le conteneur ICO : un répertoire de 16 octets par image, puis les images. */
function ico(sizes) {
  const images = sizes.map(dib);
  const directory = Buffer.alloc(6 + images.length * 16);

  directory.writeUInt16LE(0, 0); // réservé
  directory.writeUInt16LE(1, 2); // type : icône
  directory.writeUInt16LE(images.length, 4);

  let offset = directory.length;
  images.forEach((image, index) => {
    const at = 6 + index * 16;
    directory.writeUInt8(sizes[index], at); // largeur
    directory.writeUInt8(sizes[index], at + 1); // hauteur
    directory.writeUInt8(0, at + 2); // palette : aucune
    directory.writeUInt8(0, at + 3); // réservé
    directory.writeUInt16LE(1, at + 4); // plans
    directory.writeUInt16LE(32, at + 6); // bits par pixel
    directory.writeUInt32LE(image.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += image.length;
  });

  return Buffer.concat([directory, ...images]);
}

const file = ico(SIZES);
await writeFile(OUT, file);
console.log(`favicon.ico — ${SIZES.join(', ')} px, ${file.length} octets`);
