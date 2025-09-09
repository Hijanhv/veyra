# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-bullseye-slim AS base
WORKDIR /app

# Install dependencies (including dev deps for Ponder CLI)
FROM base AS deps
ENV CI=true
COPY package.json package-lock.json* ./
RUN npm ci

# Build TypeScript (if needed)
FROM deps AS build
COPY . ./
RUN npm run build || true

# Production/runtime image
FROM node:${NODE_VERSION}-bullseye-slim AS prod
WORKDIR /app
ENV NODE_ENV=production

# Keep dev deps because Ponder is declared as a devDependency
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json* ./package-lock.json

# Copy source files required for Ponder (TS loaded by Vite in-process)
COPY --from=build /app/src ./src
COPY --from=build /app/ponder.config.ts ./ponder.config.ts
COPY --from=build /app/ponder.schema.ts ./ponder.schema.ts
COPY --from=build /app/ponder-env.d.ts ./ponder-env.d.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/scripts ./scripts

EXPOSE 42069

# Health check for Ponder server (using built-in health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:42069/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Default command runs Ponder in start mode
CMD ["npm", "start"]