FROM node:22-slim AS base
WORKDIR /app

FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --legacy-peer-deps --only=production

FROM base AS build
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM base
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs
COPY --from=build /app/public ./public
COPY --from=prod-deps /app/node_modules ./node_modules
RUN mv /app/public/data /app/public/data-seed
EXPOSE 8080
COPY start.sh .
RUN chmod +x start.sh
CMD ["bash", "start.sh"]
