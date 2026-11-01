FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend application source
COPY backend/ ./
COPY dashboard/ ../dashboard/

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]
