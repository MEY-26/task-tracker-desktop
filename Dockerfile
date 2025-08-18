# Task Tracker Desktop - Docker Image
# Multi-stage build for production

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.js ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY electron/ ./electron/

# Build frontend
RUN npm run build:ui

# Stage 2: Build Electron App
FROM node:18-alpine AS electron-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm ci

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./dist
COPY electron/ ./electron/

# Build Electron app
RUN npm run build

# Stage 3: Production Runtime
FROM node:18-alpine AS production

# Install necessary packages
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=electron-builder /app/release ./release

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port (if needed for web interface)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Default command
CMD ["node", "release/TaskTracker.exe"]
