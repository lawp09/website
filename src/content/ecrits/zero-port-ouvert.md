---
title: "Zéro port ouvert"
description: "Ce que ça change de concevoir en partant du principe qu’aucun réseau, aucun client et aucun opérateur ne mérite d’être cru sur parole."
date: 2026-11-07
draft: true
tags: ["architecture", "sécurité"]
---

> Brouillon. Structure posée, voix à reprendre.

Pendant des années, la façon normale d’exposer un service chez soi a été
d’ouvrir un port sur la box et de pointer le routeur vers une machine. Ça
marche. C’est aussi un modèle où la sécurité tient à une seule chose : le
périmètre. Dedans, on se fait confiance. Dehors, on se méfie.

Le problème de ce modèle n’est pas qu’il soit faible. C’est qu’il est
**binaire**. Le jour où quelque chose franchit la frontière — un conteneur
compromis, une dépendance malveillante, un appareil personnel infecté — il n’y
a plus rien derrière.

## Ce que le principe renverse

Le zero-trust ne dit pas « méfie-toi d’Internet ». Il dit : *aucun emplacement
réseau ne confère de droit*. Être à l’intérieur ne prouve rien. Chaque accès se
justifie à nouveau, au moment où il est demandé.

Ça paraît abstrait jusqu’au moment où on en tire les conséquences de conception.

## Trois conséquences concrètes

**Plus rien n’écoute depuis l’extérieur.** La connexion part de chez moi vers
l’extérieur, jamais l’inverse. Un scan de mon adresse publique ne trouve aucun
port. Ce n’est pas de l’obscurité : il n’y a littéralement rien à joindre.

**L’authentification est en amont du service, pas dedans.** Elle ne dépend plus
de la qualité du contrôle d’accès de chaque application — y compris celles qui
n’en ont aucun.

**Les services ne se parlent pas par défaut.** Chaque autorisation réseau entre
deux composants est écrite, nommée, et doit se justifier. La question n’est plus
« qu’est-ce que je bloque ? » mais « qu’est-ce que j’autorise, et pourquoi ? ».

## Ce que ça coûte

Il faut être honnête : ce modèle déplace la complexité, il ne la supprime pas.
Une panne de la couche d’authentification coupe tout d’un coup. Chaque nouveau
service demande une décision explicite au lieu d’hériter d’un accès. Et le jour
où on débogue, l’absence de chemin direct se paie.

C’est un arbitrage, pas une victoire. Mais c’est le seul que je sache défendre
ligne par ligne — et c’est à peu près le seul critère qui compte quand on
conçoit quelque chose dont on sera encore responsable dans deux ans.
