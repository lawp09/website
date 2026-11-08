# philippelawson.net

Site personnel. Astro en génération statique, servi par nginx dans K3s.

Ce dépôt ne contient **que le code du site**. La chaîne de publication (workflow de
release, image, manifestes Kubernetes) vit dans le dépôt privé `homelab` : le dépôt
public ne porte donc aucun workflow, aucun secret et aucune permission de registre.

## Développer

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # sortie dans dist/
```

## Écrire

Un texte est un fichier Markdown dans `src/content/ecrits/`, avec ce frontmatter :

```yaml
---
title: "Titre"
description: "Une phrase, affichée dans les listes et les métadonnées."
date: 2026-11-07
draft: true
tags: ["architecture"]
---
```

Un texte en `draft: true` est visible en développement et exclu du build de production.
Le nom du fichier donne l'URL : `zero-port-ouvert.md` devient `/ecrits/zero-port-ouvert/`.

## Contraintes à ne pas casser

**Pas de JavaScript côté client.** Le site est servi sous une CSP `default-src 'none'`,
ce qui n'est possible que parce que le HTML ne contient ni script ni style inline.
Ajouter un îlot interactif oblige à ouvrir `script-src` dans le middleware Traefik.

**Pas de ressource tierce.** Les polices sont servies depuis `public/fonts/` : aucune
requête sortante, donc aucune adresse IP de visiteur transmise ailleurs.

**Pas d'inventaire d'infrastructure.** Les textes parlent de mécanismes et d'arbitrages,
pas de versions ni de topologie — une liste d'infrastructure est une carte.

## Publier

Depuis le dépôt `homelab`, lancer le workflow « Release - Site perso » en lui donnant la
ref à publier et le numéro de version, puis bumper le tag de l'image dans
`clusters/turing-k3s/apps/website/deployment.yaml`.
