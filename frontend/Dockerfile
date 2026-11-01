# ==============================================================================
# Multi-stage Dockerfile for COVID Patient Health Monitor React Frontend
# ==============================================================================

# Stage 1: Build React static assets with Vite
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:1.25-alpine

# Copy custom Nginx configuration with SPA & WebSocket reverse proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite production build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
