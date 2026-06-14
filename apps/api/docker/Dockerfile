# ── Stage 1: deps ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/utils/package.json ./packages/utils/

RUN npm ci --workspace=apps/api --workspace=packages/shared-types \
           --workspace=packages/utils --workspace=packages/typescript-config \
           --workspace=packages/eslint-config --ignore-scripts

# ── Stage 2: builder ─────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN cd apps/api && npm run build

# ── Stage 3: production ──────────────────────────────────────
FROM node:22-alpine AS production

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 apigroup && \
    adduser --system --uid 1001 --gid 1001 apiuser

WORKDIR /app

COPY --from=builder --chown=apiuser:apigroup /app/apps/api/dist ./dist
COPY --from=deps    --chown=apiuser:apigroup /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=apiuser:apigroup /app/apps/api/package.json ./package.json

USER apiuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
