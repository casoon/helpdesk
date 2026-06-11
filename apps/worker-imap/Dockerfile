FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter=@casoon/helpdesk-db... build
RUN pnpm --filter=@casoon/helpdesk-types... build
RUN pnpm --filter=@casoon/helpdesk-worker-imap build

FROM base AS deploy
WORKDIR /app
COPY --from=build /app .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm deploy --filter=@casoon/helpdesk-worker-imap --prod /prod/worker-imap

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=deploy /prod/worker-imap .
CMD ["node", "dist/index.js"]
