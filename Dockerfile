# syntax=docker/dockerfile:1.7

# ── Étape 1 : dépendances ─────────────────────────────────────────────────────
FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS deps
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
  apk add --update-cache --cache-dir /var/cache/apk python3 make g++

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  HUSKY=0 npm ci --prefer-offline --no-audit

# ── Étape 2 : build ───────────────────────────────────────────────────────────
FROM deps AS builder

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN --mount=type=cache,target=/app/.next/cache \
  npm run build

# ── Étape 3 : image de production ─────────────────────────────────────────────
FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS runner
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
  apk add --update-cache --cache-dir /var/cache/apk libstdc++

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1111 hobbyhoops \
 && adduser  --system --uid 1111 --ingroup hobbyhoops hobbyhoops

COPY --from=builder /app/public ./public
COPY --from=builder --chown=hobbyhoops:hobbyhoops /app/.next/standalone ./
COPY --from=builder --chown=hobbyhoops:hobbyhoops /app/.next/static ./.next/static

RUN mkdir -p /app/data && chown hobbyhoops:hobbyhoops /app/data

COPY --chmod=755 scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --chmod=755 scripts/docker-ensure-db.mjs /app/scripts/docker-ensure-db.mjs

RUN rm -rf \
  /sbin/apk \
  /etc/apk \
  /lib/apk \
  /var/cache/apk \
  /var/lib/apk \
  /usr/local/bin/corepack \
  /usr/local/bin/npm \
  /usr/local/bin/npx \
  /usr/local/lib/node_modules/corepack \
  /usr/local/lib/node_modules/npm

USER hobbyhoops

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
