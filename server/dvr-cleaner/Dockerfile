FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

COPY . .

RUN mkdir -p /app/logs && \
    chown -R nodeuser:nodejs /app

USER nodeuser

HEALTHCHECK --interval=60s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

CMD ["node", "index.js"]
