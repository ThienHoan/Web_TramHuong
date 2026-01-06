# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for build
# Use --frozen-lockfile for reproducible builds
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build application
COPY . .
RUN pnpm build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install pnpm for runtime usage if needed, or just node
RUN npm install -g pnpm

# Copy only necessary files
COPY package.json pnpm-lock.yaml ./
# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 4000

# Start command
CMD ["node", "dist/main"]
