![Banner](/src/resources/custom-items/growserver/interface/banner/banner.png)

> A Growtopia private server built with Bun, powered by [growtopia.wasm](https://github.com/StileDevs/growtopia.wasm)

## Requirements

- [Bun](https://bun.sh) (v1.4+)
- [Caddy](https://caddyserver.com) (or download during setup with `--with-caddy`)

## Hosts Setup

Add the following entries to your system hosts file (`/etc/hosts` or `C:\Windows\System32\drivers\etc\hosts`):

```hosts
127.0.0.1 login.growserver.test
127.0.0.1 cdn.growserver.test

127.0.0.1 growtopia1.com
127.0.0.1 growtopia2.com
127.0.0.1 www.growtopia1.com
127.0.0.1 www.growtopia2.com
```

## Setup

Run the automated setup to configure certificates, database migrations, items database, and wiki cache:

```bash
bun run setup --with-caddy
```

## Development

Start the development server with live reload and background Caddy reverse proxy:

```bash
bun run dev
```

An interactive console is available directly in the terminal while the server is active:

```text
> ping
[Server thread/INFO]: pong
```

### Useful Commands

- `bun run start`: Start production server
- `bun run compile`: Compile into a standalone executable binary
- `bun run caddy:start`: Start Caddy in background
- `bun run caddy:stop`: Stop background Caddy

## Contributing

Contributions are welcome. Please ensure:

- Code follows the project standards in [AGENTS.md](AGENTS.md).
- Code passes type checking (`bun run tsc --noEmit`).
- Pull requests are reviewed before merging into `main`.

## Links

- [Discord Server](https://discord.gg/sGrxfKZY5t)

## Contributors

Thank you to all contributors:

<a href="https://github.com/StileDevs/GrowServer">
  <img src="https://contrib.rocks/image?repo=StileDevs/GrowServer"/>
</a>
