FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
