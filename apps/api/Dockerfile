# Build Stage
FROM node:22-alpine AS builder

# https://github.com/nodejs/docker-node#nodealpine (glibc shims for some native modules)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Pinned pnpm: the lockfile is format 9.0. Never "latest" (a new major can break builds).
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production Stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

COPY --from=builder /app/dist ./dist

# Do not run the API as root.
USER node

EXPOSE 4000

CMD ["node", "dist/main"]
