# syntax=docker/dockerfile:1
# Context de build = radacina repo-ului (vezi docker-compose.yml).

# node:22, nu alpine: Vite 8 cere Node 20.19+/22.12+, iar glibc e drumul batatorit
# pentru binarul nativ `oxide` al Tailwind v4 si pentru Rollup. E un stage de build
# aruncat la final, deci marimea imaginii nu conteaza.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY frontend/carflow-client/package.json frontend/carflow-client/package-lock.json ./
RUN npm ci

COPY frontend/carflow-client/ ./

# ARG-ul vine DUPA npm ci: schimbarea URL-ului de API nu trebuie sa invalideze
# layerul de dependente. VITE_API_URL e copt in bundle la build (api.ts), nu citit
# la rulare — de aceea trebuie sa fie prezent aici, nu in docker-compose.
# vite.config.ts opreste build-ul daca lipseste sau daca are slash final.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Caddy serveste direct dist-ul. Un nginx separat ar insemna inca un container si
# inca un fisier de config pentru ceva ce Caddy face intr-o linie — si inca o
# intrebare de tipul "care dintre ele da 502?" cand ceva nu merge.
FROM caddy:2-alpine AS final
COPY --from=build /app/dist /srv
