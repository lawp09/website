# philippelawson.net

Site personnel. Astro en génération statique, servi par nginx dans K3s.

Ce dépôt porte le code du site **et la publication de son image**, déclenchée par un tag
semver — voir « Publier ». Les manifestes Kubernetes et la réconciliation Flux restent dans
le dépôt privé `homelab`. Aucun secret n'est stocké ici : la CI valide en `contents: read`,
et le job de publication se contente du `GITHUB_TOKEN` du run.

## Développer

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # sortie dans dist/
npm test         # les tests des garde-fous
npm run verify   # ce que la CI lance : typage, tests, build, garde-fous
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

Les textes publiés alimentent le flux RSS servi sur `/rss.xml`, généré par
`src/pages/rss.xml.ts`. Le flux porte le résumé, pas le texte complet.

## Contraintes à ne pas casser

**Pas de JavaScript côté client.** Le site est servi sous une CSP `default-src 'none'`,
ce qui n'est possible que parce que le HTML ne contient ni script ni style inline.
Ajouter un îlot interactif oblige à ouvrir `script-src` dans le middleware Traefik.

**Pas de ressource tierce.** Les polices sont servies depuis `public/fonts/` : aucune
requête sortante, donc aucune adresse IP de visiteur transmise ailleurs.

**Pas de coloration syntaxique à styles inline.** `astro.config.mjs` fixe
`syntaxHighlight: 'prism'`. Shiki, le défaut d'Astro, pose les couleurs en `style=` sur
`<pre>` et sur chaque `<span>`, ce qui obligerait la CSP à accepter `'unsafe-inline'`.
Prism sort des classes, colorées dans `global.css`.

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
| Aucun script ni style inline | `<script>`, `<style>`, `style="…"`, un gestionnaire `on…=""` ou une URL `javascript:`, dans **toute** page de `dist/` |
| Aucune ressource tierce | une URL vers un autre hôte dans un `src`, le `href` d'un `<link>` chargeant une ressource, ou un `url()` / `@import` du CSS produit |
| Aucune ressource embarquée en `data:` | une image ou une police en base64, que la CSP refuse aussi |
| Toute ressource locale référencée existe | une police, une feuille ou une image que `dist/` demande mais ne contient pas |
| `inlineStylesheets: 'never'` | une autre valeur dans `astro.config.mjs` |

Un lien vers l'extérieur dans le corps d'un texte reste légitime : il ne charge rien, c'est
le lecteur qui décide de le suivre. Seuls les attributs qui provoquent une requête sont
contraints — un `<a href="https://…">` passe, un `<link rel="stylesheet">` distant échoue.

Les contrôles s'imbriquent : le compilateur Astro externalise déjà les `<style>` de
composant, donc un `<style>` n'atteint le HTML que si `inlineStylesheets` change de valeur.
Vérifier la config en plus de la sortie ferme ce chemin avant qu'il s'ouvre. Et c'est le
contrôle de l'attribut `style=` qui rattrape un retour à Shiki sur la coloration
syntaxique, puisqu'il poserait ses couleurs là.

Le contrôle d'existence couvre l'angle mort des autres : une police renommée ou un
chemin mal tapé ne casse ni le build ni la CSP. Le navigateur prend un 404 en silence et
retombe sur une police système — le site reste « valide » et ne ressemble plus à rien.
C'est le risque réel dès qu'un fichier de `public/` est câblé à deux endroits (son
`@font-face` et son `<link rel="preload">`).

Ces contrôles sont la seule chose qui tienne la CSP depuis ce dépôt, donc ils ont leurs
propres tests — `scripts/check-constraints.test.mjs`, en `node --test`, sans dépendance :

```sh
npm test
```

## Dessiner

Le système visuel — pigments, surfaces, caractères, motifs, mouvement — est décrit dans
`docs/design.md`, à lire avant de modifier `src/styles/global.css`. Les polices servies ne
sont pas des sous-ensembles Google standards : la même page dit pourquoi et comment les
refaire.

Les ressources graphiques se regravent depuis le dépôt, sans dépendance ajoutée —
`scripts/make-favicon.mjs` pour le `.ico`, `scripts/make-og.mjs` pour l'image de partage.
La même page dit ce que chacun trace.

## Intégration continue

`.github/workflows/ci.yml` tourne sur push et sur pull request vers `main` : `npm ci`,
`astro check`, les tests des garde-fous, `npm run build`, puis les garde-fous eux-mêmes —
ce que `npm run verify` enchaîne en local. `main` est protégée, tout passe donc
par une pull request.

Le workflow est en `contents: read` et ses actions sont **épinglées par SHA** : le dépôt
est public, et un tag comme `v7` peut être repointé sur du code arbitraire. Pour mettre
une action à jour, résoudre le SHA du tag visé plutôt que l'écrire de mémoire :

```sh
gh api repos/actions/checkout/commits/v7 --jq .sha
```

## Publier

Couper un tag semver sur `main` suffit :

```sh
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

`.github/workflows/release.yml` se déclenche sur `v*` **et seulement sur un tag** : il
rejoue typage, build et garde-fous, puis construit l'image et la pousse sur
`ghcr.io/lawp09/website`. Le tag git `v0.1.0` produit l'image `0.1.0`, forme attendue par
`clusters/turing-k3s/apps/website/deployment.yaml` dans `homelab`. Un tag qui n'est pas un
semver `vX.Y.Z` fait échouer le job avant toute publication.

L'image ne porte **qu'un** tag semver immuable, jamais `latest` : c'est ce qui permet à
Renovate de ne comparer que des versions pour bumper le manifeste, Flux réconciliant au
merge de sa pull request.

Le build tourne sur `ubuntu-24.04-arm` — les nœuds du cluster sont en arm64, et l'émulation
QEMU rendrait le build lent. Les runners arm64 sont gratuits sur un dépôt public.

### Ce que ça change pour la séparation des dépôts

Ce dépôt publiait auparavant *zéro* image : tout partait de `homelab`, privé. La
publication est désormais ici, donc le dépôt public porte un job avec `packages: write`.
C'est un élargissement assumé de sa surface. Ce qui le tient :

- `permissions` déclarées **par job**, rien au niveau du workflow — `packages: write` n'est
  accordé qu'au job qui pousse, et un job ajouté sans `permissions` n'hérite d'aucun droit.
- Déclenchement sur tag uniquement : aucune pull request ne peut publier, et il n'y a pas
  de `pull_request_target`.
- Aucun secret ajouté : le `GITHUB_TOKEN` du run suffit pour GHCR.
- Publication gatée par les garde-fous : une image qui violerait la CSP ne part pas.

Le workflow `website-release.yml` de `homelab` fait double emploi avec celui-ci et devrait
être retiré là-bas.
