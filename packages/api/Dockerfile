# syntax=docker/dockerfile:1.7
FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS build-deps
COPY package.json bun.lock ./
COPY packages/api/package.json packages/api/package.json
COPY packages/worker/package.json packages/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile --filter '@mise/api' --filter '@mise/shared'

FROM base AS build
COPY --from=build-deps /app/node_modules ./node_modules
COPY --from=build-deps /app/package.json ./package.json
COPY --from=build-deps /app/bun.lock ./bun.lock
COPY --from=build-deps /app/packages ./packages
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared
RUN bun run --filter './packages/api' build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build-deps /app/node_modules ./node_modules
COPY --from=build-deps /app/package.json ./package.json
COPY --from=build-deps /app/packages/api ./packages/api
COPY --from=build-deps /app/packages/shared ./packages/shared
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/shared ./packages/shared

WORKDIR /app/packages/api
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["bun", "-e", "try { const port = process.env.PORT || '8080'; const res = await fetch(`http://127.0.0.1:${port}/health`); if (!res.ok) throw new Error(`healthcheck failed: ${res.status}`); } catch { process.exit(1); }"]
CMD ["bun", "dist/index.js"]
