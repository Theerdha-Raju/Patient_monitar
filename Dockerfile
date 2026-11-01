FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# Copy backend source code and dashboard
WORKDIR /app
COPY backend/ ./backend/
COPY dashboard/ ./dashboard/

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "backend/server.js"]
