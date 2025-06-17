# Stage 1: Install dependencies
FROM node:20-slim AS deps
WORKDIR /usr/src/app

COPY frontend/package*.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-slim AS builder
WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY frontend/ .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Stage 3: Production image
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Next.js standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder --chown=node:node /usr/src/app/.next/standalone ./
COPY --from=builder --chown=node:node /usr/src/app/.next/static ./.next/static

USER node

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"] 