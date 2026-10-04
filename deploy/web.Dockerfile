# syntax=docker/dockerfile:1

FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.server.json ./
COPY public ./public
COPY src ./src
RUN npm run build

# Runs as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY deploy/security-headers.conf /etc/nginx/security-headers.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
