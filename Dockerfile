# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY apps/widget/package.json ./apps/widget/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY packages/widget-loader/package.json ./packages/widget-loader/

RUN npm ci

# Copy full source and build
COPY . .
RUN npm run build --workspaces --if-present

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV REDIS_ENABLED=true

# Copy package descriptors and built assets
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/dashboard/dist ./apps/dashboard/dist
COPY --from=builder /app/apps/widget/dist ./apps/widget/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-config/dist ./packages/shared-config/dist
COPY --from=builder /app/packages/widget-loader/dist ./packages/widget-loader/dist

# Expose API Gateway port
EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
