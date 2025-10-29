FROM alpine AS mkcert-build

RUN apk --no-cache add curl
RUN curl -JLO "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64" && \
  chmod +x mkcert-v1.4.4-linux-amd64

FROM node:22-alpine

WORKDIR /app
COPY . .
COPY --from=mkcert-build /mkcert-v1.4.4-linux-amd64 /app/.cache/bin/mkcert

VOLUME ["/app/data", "/app/.cache", "/app/assets"]

RUN corepack enable && corepack prepare pnpm@latest

RUN pnpm install --frozen-lockfile

EXPOSE 80/tcp
EXPOSE 8080/tcp
EXPOSE 443/tcp
EXPOSE 17091/udp

# RUN chmod +x /app/.cache/bin/mkcert

CMD ["pnpm", "dev"]