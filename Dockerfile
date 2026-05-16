# ── Étape 1 : dépendances ─────────────────────────────────────────────────────
FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN HUSKY=0 npm ci

# ── Étape 2 : build ───────────────────────────────────────────────────────────
FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ── Étape 3 : image de production ─────────────────────────────────────────────
FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS runner
WORKDIR /app

RUN apk add --no-cache libstdc++

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

USER hobbyhoops

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
