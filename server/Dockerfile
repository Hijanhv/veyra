# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-bullseye-slim AS base
WORKDIR /app

# Install dependencies (including dev deps for Ponder CLI)
FROM base AS deps
ENV CI=true
COPY package.json package-lock.json ./
RUN npm ci

# Build TypeScript server to dist/
FROM deps AS build
COPY . ./
RUN npm run build

# Production/runtime image (used for both API and Indexer)
FROM node:${NODE_VERSION}-bullseye-slim AS prod
WORKDIR /app
ENV NODE_ENV=production

# Keep dev deps because Ponder is declared as a devDependency
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

# Server runtime (compiled)
COPY --from=build /app/dist ./dist

# Source files required for Ponder (TS loaded by Vite in-process)
COPY --from=build /app/src ./src
COPY --from=build /app/ponder.config.ts ./ponder.config.ts
COPY --from=build /app/ponder.schema.ts ./ponder.schema.ts
COPY --from=build /app/ponder-env.d.ts ./ponder-env.d.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/scripts ./scripts

EXPOSE 8080 42069

# Default command runs the API server. Compose overrides the command for the indexer service.
CMD ["node", "dist/server.js"]
