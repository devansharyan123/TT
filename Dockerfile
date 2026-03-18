# syntax=docker/dockerfile:1.7

########################
# Backend image stages #
########################
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

FROM backend-deps AS backend-build
WORKDIR /app/backend
COPY backend/ ./
RUN ./node_modules/.bin/prisma generate --schema prisma/schema.prisma
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS backend-prod
WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=backend-build /app/backend/package*.json ./
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]

#########################
# Frontend image stages #
#########################
FROM node:20-alpine AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

FROM frontend-deps AS frontend-build
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS frontend-prod
WORKDIR /app/frontend
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY frontend/package*.json ./
RUN npm ci --omit=dev
COPY --from=frontend-build /app/frontend/.next ./.next
COPY --from=frontend-build /app/frontend/public ./public
EXPOSE 3000
CMD ["npm", "run", "start"]
