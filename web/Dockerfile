FROM node:24-alpine AS base
WORKDIR /app

FROM base AS dependencies
RUN npm install --global pnpm@10.34.9
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Desenvolvimento (docker compose): `next dev` com o código vindo por volume.
# node_modules e .next ficam em volumes anônimos, fora do código montado.
FROM dependencies AS dev
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM dependencies AS builder
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup --system --gid 1001 nextjs \
    && adduser --system --uid 1001 --ingroup nextjs nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
