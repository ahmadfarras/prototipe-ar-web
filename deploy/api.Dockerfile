# syntax=docker/dockerfile:1

# Production dependencies only. package.json keeps web packages in
# devDependencies, so this installs just what the API needs at runtime.
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM node:26-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server/migrations ./server/migrations
COPY server/seed ./server/seed
COPY server/scripts ./server/scripts
COPY server/src ./server/src
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/api/v1/health || exit 1
CMD ["node", "server/src/main.ts"]
