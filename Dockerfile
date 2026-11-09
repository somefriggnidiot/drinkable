FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS development
COPY . .
RUN mkdir -p .next data/media && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["pnpm","dev"]

FROM dependencies AS build
COPY . .
ARG NEXT_PUBLIC_MAPTILER_KEY
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADSENSE_HOME_SLOT
ARG NEXT_PUBLIC_ADSENSE_RESULTS_SLOT
ARG NEXT_PUBLIC_ADSENSE_DETAIL_SLOT
ARG NEXT_PUBLIC_COOKIEYES_ID
ENV NEXT_PUBLIC_MAPTILER_KEY=$NEXT_PUBLIC_MAPTILER_KEY \
    NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT \
    NEXT_PUBLIC_ADSENSE_HOME_SLOT=$NEXT_PUBLIC_ADSENSE_HOME_SLOT \
    NEXT_PUBLIC_ADSENSE_RESULTS_SLOT=$NEXT_PUBLIC_ADSENSE_RESULTS_SLOT \
    NEXT_PUBLIC_ADSENSE_DETAIL_SLOT=$NEXT_PUBLIC_ADSENSE_DETAIL_SLOT \
    NEXT_PUBLIC_COOKIEYES_ID=$NEXT_PUBLIC_COOKIEYES_ID
RUN BETTER_AUTH_SECRET=build-only-secret-not-used-at-runtime-123456 APP_URL=http://localhost:3000 pnpm build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node infra/entrypoint.mjs ./infra/entrypoint.mjs
RUN mkdir -p /app/data/media /app/.next/cache && chown -R node:node /app/data /app/.next/cache
USER node
EXPOSE 3000
ENTRYPOINT ["node","infra/entrypoint.mjs"]
CMD ["node","server.js"]
