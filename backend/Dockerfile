# Stage 1: Build the application
FROM node:20 AS builder

WORKDIR /usr/src/app

COPY backend/package*.json ./

RUN npm ci

COPY backend/ .

RUN npm run build

# Stage 2: Create the production image
FROM node:20-slim

WORKDIR /usr/src/app

# Copy built app and dependencies
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/main"] 