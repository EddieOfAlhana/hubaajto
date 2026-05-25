# syntax=docker/dockerfile:1.7

# ─── Stage 1: build ───────────────────────────────────────────────
# Astro 6 + @astrojs/node standalone — output is a Node server bundle
# that serves both the prerendered static files and the /api/lead route.
FROM node:22-alpine AS build
WORKDIR /app

# Copy lockfiles first for better Docker layer caching.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Build the site.
COPY . .
RUN npm run build

# Drop dev-only deps so the runtime image stays small.
RUN npm prune --omit=dev

# ─── Stage 2: runtime ─────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Non-root user — small but real hardening win.
RUN addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

# Pull just the runtime artefacts from the build stage.
COPY --from=build --chown=app:app /app/dist        ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 8080

# The Astro Node adapter in "standalone" mode emits dist/server/entry.mjs
# as a complete Node HTTP server. Honors HOST/PORT env vars.
CMD ["node", "./dist/server/entry.mjs"]
