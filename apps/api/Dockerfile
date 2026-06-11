FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Build stage: full monorepo context
FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter=@casoon/helpdesk-db... build
RUN pnpm --filter=@casoon/helpdesk-types... build
RUN pnpm --filter=@casoon/helpdesk-api build

# Deploy stage: isolated production dir via pnpm deploy
FROM base AS deploy
WORKDIR /app
COPY --from=build /app .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm deploy --filter=@casoon/helpdesk-api --prod /prod/api

# Runtime
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=deploy /prod/api .
EXPOSE 3000
CMD ["node", "dist/index.js"]
