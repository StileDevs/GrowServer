FROM node:22-alpine

WORKDIR /app
COPY . .

VOLUME ["/app/data", "/app/.cache", "/app/assets"]

RUN corepack enable && corepack prepare pnpm@latest

RUN pnpm install --frozen-lockfile

EXPOSE 80/tcp
EXPOSE 8080/tcp
EXPOSE 443/tcp
EXPOSE 17091/udp

RUN chmod +x /app/.cache/bin/mkcert

CMD ["pnpm", "dev"]