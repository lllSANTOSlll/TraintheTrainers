# ─────────────────────────────────────────────────────────
# Stage 1 — Install production dependencies
#   Uses Debian slim to guarantee glibc for sqlite3 native binaries.
#   Build tools are present here but NOT copied to the final image.
# ─────────────────────────────────────────────────────────
FROM node:20-slim AS deps

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev


# ─────────────────────────────────────────────────────────
# Stage 2 — Production image (no build tools, no dev deps)
# ─────────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Non-root user for security
RUN groupadd --gid 1001 appgroup && \
    useradd  --uid 1001 --gid appgroup --shell /bin/sh --create-home appuser

# Copy application source (excluding what .dockerignore strips)
COPY --chown=appuser:appgroup . .

# Replace Windows node_modules with the clean production build
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules

# Pre-create every directory that multer and the DB will write to.
# Docker volume mounts overlay these dirs at runtime — creating them in the
# image means the container won't crash on startup before the volume is ready.
RUN mkdir -p \
      database \
      backups \
      uploads \
      public/uploads/employees/attachments \
      public/uploads/stations \
      templates && \
    chown -R appuser:appgroup database backups uploads public/uploads templates && \
    chmod +x docker-entrypoint.sh

USER appuser

EXPOSE 5000

# Health check — uses Node itself (no curl/wget needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD node -e "\
const http = require('http'); \
http.get('http://localhost:5000/login', (r) => { \
  process.exit(r.statusCode >= 500 ? 1 : 0); \
}).on('error', () => process.exit(1));"

ENTRYPOINT ["./docker-entrypoint.sh"]
