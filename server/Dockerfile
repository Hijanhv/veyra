# Build stage
FROM node:20-slim as builder

# Setting up the work directory
WORKDIR /app

# COPY package.json and package-lock.json
COPY package.json package-lock.json ./

# Installing all dependencies (including dev dependencies for building)
RUN npm ci

# Copying all the files in our project
COPY . ./

# Build TypeScript server to dist/
RUN npm run build

# Development stage
FROM node:20-slim as dev

# Setting up the work directory
WORKDIR /app

# Declaring env
ENV NODE_ENV=development

# COPY package.json and package-lock.json
COPY package.json package-lock.json ./

# Installing all dependencies (including dev dependencies)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . ./

# Exposing server port
EXPOSE 8080

# Health check for API server
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "import('http').then(http => http.get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1)))"

# Starting our application in dev mode
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-slim as prod

# Setting up the work directory
WORKDIR /app

# Declaring env
ENV NODE_ENV=production

# COPY package.json and package-lock.json
COPY package.json package-lock.json ./

# Installing only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy any static assets if needed (abi files are copied during postbuild step)

# Exposing server port
EXPOSE 8080

# Health check for API server
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "import('http').then(http => http.get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1)))"

# Starting our application
CMD ["npm", "start"]