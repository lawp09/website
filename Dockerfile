# syntax=docker/dockerfile:1

# --- Build ---------------------------------------------------------
# Node 26 : LTS active depuis octobre 2026.
# Cet étage est jeté : ni Node ni node_modules ne sont livrés en production.
FROM node:26-alpine AS builder

WORKDIR /app

# npm ci (jamais npm install) : le lockfile fait foi, le build est reproductible.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime -------------------------------------------------------
# nginx-unprivileged : UID 101, écoute sur 8080, aucune capability root requise.
# Version pinnée : un tag flottant ferait entrer une image non revue.
# Les probes de disponibilite sont portees par le Deployment, pas par l'image.
FROM nginxinc/nginx-unprivileged:1.31-alpine-slim

COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=101:101 /app/dist /usr/share/nginx/html

EXPOSE 8080
