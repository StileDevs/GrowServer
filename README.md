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

Console commands while the server runs: `ping`, `list`, `role <growid> <basic|supporter|moderator|developer>`, `say <message>`, `save`, `stop`.

## Running locally on Windows with the real client

The Growtopia client only accepts a trusted certificate for `www.growtopia1.com`. Issue one with [mkcert](https://github.com/FiloSottile/mkcert) from your own shell (so the CA lands in your user store), then point the server at it:

```bash
mkcert -install
```

```bash
mkcert -cert-file .cache/tls/cert.pem -key-file .cache/tls/key.pem growtopia1.com www.growtopia1.com growtopia2.com www.growtopia2.com login.growserver.test cdn.growserver.test localhost
```

Start with `bun run src/index.ts start:local` (Caddy on 443 in front of the logon, login and CDN servers), register an account on the login page the client opens, and give yourself the developer role from the console with `role <growid> developer` (`/find`, `/search`, `/warp`, ... are developer commands).

### Troubleshooting

| Symptom in the client | Cause / fix |
| --- | --- |
| "Check your internet and make sure you are not using VPN" | `server_data.php` was not answered: the client alternates between `growtopia1.com` and `growtopia2.com` (both with and without `www`), so all four hosts must resolve to `127.0.0.1` and be covered by the certificate and the Caddy site block. |
| Same message, server logs "rejected server data request" | The logon user agent differs per platform (`..._PC64_ansi_static`, `..._ANDROID64_static`); only the `UbiServices_SDK` prefix is matched. |
| "Download failed" for garbage file names after login | `items.dat` was decoded with an old `grow-items`; version 27 needs `grow-items` 1.3.8+. Delete `.cache/wiki.json` and run `bun run wiki` after upgrading. |
| Chat says "Chat is disabled." | The login page must return `accountAge: 2`, and the logon must send `OnOverrideGDPRFromServer` and `isPayingUser=1` (see AGENTS.md section 20). |
| White avatar, empty profile HUD | The avatar net ID was 0; players get per-world net IDs from 1. |
| You stay connected after the server is restarted | The server was force-killed; stop it with Ctrl+C or the console `stop` command so players are disconnected. |
| `curl` fails with `CRYPT_E_NO_REVOCATION_CHECK` | Windows curl checks revocation and mkcert certificates have no CRL; pass `--ssl-no-revoke`. The game client is not affected. |

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
