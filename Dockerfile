# Stage 1: Install dependencies
# Used by docker-compose.dev.yml as the dev target
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------- #
# Stage 2: Build the application
FROM deps AS builder

ARG VITE_BASE_URL
ENV VITE_BASE_URL=${VITE_BASE_URL}

COPY . .
RUN pnpm run build

# ------------------------------------------------------------------- #
# Stage 3: Production runner (nginx serving static files)
FROM nginx:alpine AS runner

COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
