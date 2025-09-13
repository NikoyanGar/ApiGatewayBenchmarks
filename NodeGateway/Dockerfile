FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy manifests and install prod deps deterministically
COPY NodeGateway/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy app
COPY NodeGateway/server.js ./

ENV PORT=8002
ENV UPSTREAM=http://backend-api:8080

EXPOSE 8002
CMD ["node", "server.js"]