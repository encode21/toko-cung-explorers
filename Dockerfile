# Multi-stage web image for Toko Cung Explorers (TanStack Start / Nitro)
#
# Default target = production (CloudPanel / docker compose).
# Dev: docker-compose.dev.yml sets target: dev

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci || npm install

FROM deps AS build
WORKDIR /app
COPY . .
# VITE_* di-bake saat build (browser bundle)
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_PUBLISHABLE_KEY=
ARG VITE_SUPABASE_PROJECT_ID=
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
# Prefer Node server output (Lovable default may be Cloudflare).
ENV NITRO_PRESET=node-server
RUN npm run build && mkdir -p .output dist

FROM deps AS dev
WORKDIR /app
COPY . .
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_PUBLISHABLE_KEY=
ARG VITE_SUPABASE_PROJECT_ID=
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
EXPOSE 8080
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_PUBLISHABLE_KEY=
ARG VITE_SUPABASE_PROJECT_ID=
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/public ./public
COPY --from=build /app/.output ./.output
COPY --from=build /app/dist ./dist
COPY --from=build /app/vite.config.ts ./
COPY --from=build /app/tsconfig.json ./
USER app
EXPOSE 8080
# Nitro node-server if present; otherwise Vite preview of the build
CMD ["sh", "-c", "if [ -f .output/server/index.mjs ]; then exec node .output/server/index.mjs; else exec npx vite preview --host 0.0.0.0 --port 8080; fi"]
