# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et ce projet
adhère au [versionnage sémantique](https://semver.org/lang/fr/).

## [Unreleased]

### Added

- Site personnel en Astro généré statiquement : accueil, écrits, outils et page 404, avec
  une collection Markdown au schéma figé pour pouvoir alimenter les textes depuis une
  autre source plus tard sans refonte.
- Image de production nginx sans Node ni `node_modules` : une vulnérabilité de dépendance
  npm atteint le build, jamais le site servi.
- Polices servies depuis le site lui-même : aucune requête vers un tiers, donc aucune
  adresse IP de visiteur transmise ailleurs.
- Interdiction du JavaScript et des styles inline, qui rend possible une CSP
  `default-src 'none'`, désormais vérifiée sur la sortie de build par
  `npm run check:constraints` — voir README, « Les garde-fous ».
- Intégration continue sur push et pull request vers `main` : typage, build et garde-fous,
  en `contents: read` et actions épinglées par SHA puisque le dépôt est public — voir
  README, « Intégration continue ».
