# Railway-friendly Dockerfile (optional)
FROM node:20-alpine AS base
WORKDIR /app

# Install deps for backend only
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY backend ./

# Build
RUN npm run build

# Run
ENV NODE_ENV=production
EXPOSE 3003
CMD ["sh", "-c", "npm run migrate:deploy && node dist/index.js"]
