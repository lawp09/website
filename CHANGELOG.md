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
  adresse IP de visiteur transmise ailleurs — voir `docs/design.md`, « Les caractères ».
- Interdiction du JavaScript et des styles inline, qui rend possible une CSP
  `default-src 'none'` — coloration syntaxique comprise, passée à Prism parce que Shiki
  pose ses couleurs en `style=` ; voir README, « Contraintes à ne pas casser ».
- Intégration continue sur push et pull request vers `main` : typage, tests, build et
  garde-fous qui refusent tout ce que la CSP refuserait en production. En `contents: read`
  et actions épinglées par SHA puisque le dépôt est public — voir README, « Les
  garde-fous » et « Intégration continue ».
- Publication de l'image sur `ghcr.io/lawp09/website` déclenchée par un tag `v*` et rien
  d'autre : le tag `v0.1.0` produit l'image `0.1.0`, seul tag poussé, pour que Renovate
  n'ait que des versions à comparer. Build arm64 natif, `packages: write` accordé au seul
  job qui pousse, aucun secret ajouté — voir README, « Publier ».
- Direction visuelle « Kente » : kaolin et ébène, un parcours en timbres postaux et une
  section sur le métissage franco-togolais — le site dit d'où il vient au lieu de rester
  neutre ; voir `docs/design.md`.
- Mise en page des textes longs (listes, citations, légendes, tableaux, code) et états de
  survol et de focus conçus sur la liste d'écrits, au lieu des réglages par défaut.
- Flux RSS sur `/rss.xml`, sans dépendance ajoutée, pour que le site puisse être suivi.
- Favicon, icône d'application et image de partage propres au site, avec les métadonnées
  Open Graph et Twitter qui vont avec.
