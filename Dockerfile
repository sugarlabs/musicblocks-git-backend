# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (including devDeps for tsc)
# python3, make, g++ are needed by node-gyp to compile better-sqlite3 (native C++ addon)
COPY package*.json ./
RUN apk add --no-cache python3 make g++ && npm ci

# Copy source and compile
COPY . .
RUN npm run build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Non-root user — never run Node as root in production
RUN addgroup -S mbgroup && adduser -S mbuser -G mbgroup

# libstdc++ is required at runtime by better-sqlite3's compiled native addon
RUN apk add --no-cache libstdc++

# Copy only what's needed to run
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# SQLite volume mount point
RUN mkdir -p /var/lib/musicblocks && chown mbuser:mbgroup /var/lib/musicblocks

USER mbuser

EXPOSE 5001

# Docker will restart the container if /health stops responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5001/health || exit 1

CMD ["node", "dist/index.js"]
