# philippelawson.net

Site personnel. Astro en génération statique, servi par nginx dans K3s.

Ce dépôt ne contient **que le code du site**. La chaîne de publication (workflow de
release, image, manifestes Kubernetes) vit dans le dépôt privé `homelab` : le dépôt
public ne porte aucun secret et aucune permission de registre. Son seul workflow,
`.github/workflows/ci.yml`, valide le code en lecture seule (`contents: read`) et ne
publie rien.

## Développer

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # sortie dans dist/
npm run verify   # ce que la CI lance : typage, build, garde-fous
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

### Les garde-fous

La CSP vit dans le middleware Traefik du dépôt `homelab` : rien ici ne signale qu'un
`<script>` ou une police distante casserait la page en production. `scripts/check-constraints.mjs`
tient ce contrat à sa place, sur la sortie de build :

```sh
npm run build
npm run check:constraints
```

| Contrôle | Ce qu'il refuse |
|---|---|
| Aucun script ni style inline | `<script>`, `<style>` ou `style="…"` dans **toute** page de `dist/` |
| Aucune ressource tierce | une URL vers un autre hôte dans un `src`, le `href` d'un `<link>` chargeant une ressource, ou un `url()` / `@import` du CSS produit |
| `inlineStylesheets: 'never'` | une autre valeur dans `astro.config.mjs` |

Un lien vers l'extérieur dans le corps d'un texte reste légitime : il ne charge rien, c'est
le lecteur qui décide de le suivre. Seuls les attributs qui provoquent une requête sont
contraints — un `<a href="https://…">` passe, un `<link rel="stylesheet">` distant échoue.

Les trois contrôles s'imbriquent : le compilateur Astro externalise déjà les `<style>` de
composant, donc un `<style>` n'atteint le HTML que si `inlineStylesheets` change de valeur.
Vérifier la config en plus de la sortie ferme ce chemin avant qu'il s'ouvre.

## Intégration continue

`.github/workflows/ci.yml` tourne sur push et sur pull request vers `main` : `npm ci`,
`astro check`, `npm run build`, puis les garde-fous. `main` est protégée, tout passe donc
par une pull request.

Le workflow est en `contents: read` et ses actions sont **épinglées par SHA** : le dépôt
est public, et un tag comme `v7` peut être repointé sur du code arbitraire. Pour mettre
une action à jour, résoudre le SHA du tag visé plutôt que l'écrire de mémoire :

```sh
gh api repos/actions/checkout/commits/v7 --jq .sha
```

## Publier

Depuis le dépôt `homelab`, lancer le workflow « Release - Site perso » en lui donnant la
ref à publier et le numéro de version, puis bumper le tag de l'image dans
`clusters/turing-k3s/apps/website/deployment.yaml`.
