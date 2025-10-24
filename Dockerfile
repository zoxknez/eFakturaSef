# Multi-stage build for SEF eFakture Application

# Stage 1: Build shared package
FROM node:18-alpine AS shared-builder
WORKDIR /app/shared
COPY shared/package*.json ./
RUN npm ci --only=production
COPY shared/ .
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY --from=shared-builder /app/shared/dist ./node_modules/@sef-app/shared
COPY backend/ .
RUN npm run build

# Stage 3: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY --from=shared-builder /app/shared/dist ./node_modules/@sef-app/shared
COPY frontend/ .
RUN npm run build

# Stage 4: Production image
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built applications
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/package*.json ./backend/
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/dist ./frontend/dist

# Copy shared package
COPY --from=shared-builder --chown=nextjs:nodejs /app/shared/dist ./shared/dist
COPY --from=shared-builder --chown=nextjs:nodejs /app/shared/package*.json ./shared/

# Copy root package.json
COPY --chown=nextjs:nodejs package*.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3001 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["dumb-init", "node", "backend/dist/index.js"]
