# syntax=docker.io/docker/dockerfile:1

# --- Base Stage ---
# Sets up the base Node.js environment.
FROM node:20-alpine AS base
WORKDIR /app

# --- Dependencies Stage ---
# Installs production dependencies. Caching this layer speeds up future builds.
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# --- Production Stage ---
# Creates the final, lean production image.
FROM base AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run as a non-root user for better security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
USER appuser

# Set the port and expose it
ENV PORT=5000
EXPOSE 5000

# Set the default command to run the app
CMD ["node", "index.js"]
