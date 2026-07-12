FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
ENV COREPACK_ENABLE_STRICT=0
ENV npm_config_ignore_scripts=true
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

COPY . .

EXPOSE 5173
CMD ["sh", "-c", "pnpm install --no-frozen-lockfile --ignore-scripts 2>/dev/null; exec pnpm dev --host"]
