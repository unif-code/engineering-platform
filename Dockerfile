# syntax=docker/dockerfile:1
FROM node:24.12.0-alpine AS builder
WORKDIR /app
# 构建上下文不含 .git，跳过 husky prepare 钩子
ENV HUSKY=0
RUN corepack enable
COPY . .
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile && pnpm build

FROM nginx:stable-alpine@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46
COPY --from=builder /app/dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
