// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://philippelawson.net',
  // SSG pur : aucun adaptateur, aucun runtime serveur en production.
  // L'image livrée ne contient ni Node ni node_modules.
  markdown: {
    // Shiki pose les couleurs en style inline sur <pre> et chaque <span>, ce
    // qui obligerait la CSP a accepter 'unsafe-inline'. Prism sort des classes,
    // colorees par le theme ecrit dans global.css.
    syntaxHighlight: 'prism',
  },
  build: {
    format: 'directory',
    // 'auto' inlinerait les petites feuilles dans le HTML, ce qui obligerait
    // la CSP a accepter 'unsafe-inline'. On garde tout externe pour pouvoir
    // servir le site sous default-src 'none'.
    inlineStylesheets: 'never',
  },
});
