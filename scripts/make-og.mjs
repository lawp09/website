#!/usr/bin/env node
/**
 * Peint `public/og.png`, l'image de partage 1200×630.
 *
 * Elle porte du texte dans les polices du site. Les rasteriser depuis Node
 * demanderait de les installer sur le système — c'est le détour que
 * `docs/design.md` écarte. On passe donc par un navigateur, qui sait composer
 * du texte : ce script sert `scripts/og-card.html` et les woff2 de
 * `public/fonts/`, la page trace la carte dans un `<canvas>`, la renvoie en
 * PNG, et le serveur l'écrit puis s'arrête.
 *
 * Usage : node scripts/make-og.mjs   puis ouvrir l'adresse affichée.
 */

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CARD = join(ROOT, 'scripts', 'og-card.html');
const FONTS = join(ROOT, 'public', 'fonts');
const OUT = join(ROOT, 'public', 'og.png');
const PORT = Number(process.env.PORT ?? 4330);

/** Lit le corps d'une requête en entier. */
async function body(request) {
  const morceaux = [];
  for await (const morceau of request) morceaux.push(morceau);
  return Buffer.concat(morceaux);
}

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url, `http://localhost:${PORT}`);

  if (request.method === 'POST' && pathname === '/og.png') {
    const png = await body(request);
    await writeFile(OUT, png);
    response.writeHead(204).end();
    console.log(`public/og.png — 1200×630, ${png.length} octets`);
    server.close();
    return;
  }

  if (pathname === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(await readFile(CARD));
    return;
  }

  // `basename` referme le chemin sur public/fonts : le serveur ne sert que
  // les polices, même si on lui demande autre chose.
  if (pathname.startsWith('/fonts/')) {
    try {
      const font = await readFile(join(FONTS, basename(pathname)));
      response.writeHead(200, { 'content-type': 'font/woff2' });
      response.end(font);
    } catch {
      response.writeHead(404).end();
    }
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Ouvrir http://localhost:${PORT}/ — la page écrit le fichier et le serveur s'arrête.`);
});
