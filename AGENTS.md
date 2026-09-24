# GrowServer - AI Agent Development Guidelines & Standards

This document establishes the official coding standards, architectural patterns, logging rules, and conventions for AI assistants working on **GrowServer**.

---

## 1. Code Comments & Documentation Standards
- **English Only:** All code comments, JSDoc tags, and internal code documentation MUST be written in **English**.
- **JSDoc Usage:** Use JSDoc comments (`/** ... */`) for public methods, classes, and exported helper functions.

---

## 2. Logger Conventions
- **Strict Lowercase Logging:** All log message strings passed to `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()` MUST be **100% lowercase**.
- **No Capitalization:** Never capitalize the first letter of a log string or sentence.
  - ❌ `logger.info("Server started on port 17091")`
  - ✅ `logger.info({ port }, "game server started on")`
- **Use Dedicated Logger over `console.log`:** Always use the centralized `logger` from `src/utils/logger.ts`. Avoid `console.log` or `console.error` in server logic and automation scripts.
- **No Excessive Symbols & Blank Spacing:** Avoid bracket status tags (e.g. `[1/6]`, `[✓]`, `[!]`), ANSI escape color clutter, and excessive newlines. Instead, use clean lowercase messages with structured metadata objects:
  - ❌ `console.log("\n\x1b[32m[✓] Setup completed in 2s!\x1b[0m\n")`
  - ❌ `logger.info("[1/7] checking server configuration...")`
  - ✅ `logger.info({ step: 1, total: 7 }, "checking server configuration")`
  - ✅ `logger.info({ elapsed: "2s" }, "setup completed successfully")`
- **Minecraft Server Thread Log Format:** Log formatting follows the Minecraft server standard: `[HH:mm:ss] [<thread>/<LEVEL>]: <message>`.
  - **Default Thread Name:** The thread name defaults to `"Server thread"`.
  - **Thread Metadata Override:** Specific components, sub-servers, or subsystems can pass custom thread metadata:
    - ✅ `logger.info("server ready to use")` -> `[12:34:56] [Server thread/INFO]: server ready to use`
    - ✅ `logger.info({ thread: "GameServer:17091" }, "listening on port")` -> `[12:34:56] [GameServer:17091/INFO]: listening on port`
    - ✅ `logger.info({ thread: "LoginServer" }, "login server started")` -> `[12:34:56] [LoginServer/INFO]: login server started`
  - **Clean Identifiers:** Process ID (`pid`) and `hostname` are omitted from log prefixes (`ignore: "pid,hostname"`).
  - **Colorized Output:** Thread names are highlighted in cyan, while level labels reflect severity (gray for TRACE/DEBUG, green for INFO, yellow for WARN, red for ERROR/FATAL).
  - **Readline Prompt Collision Prevention:** The logger destination stream coordinates with `setActiveReadline(rl)`. When logs are emitted while an operator is typing into the interactive server console, the active terminal line is cleared and re-prompted dynamically without corrupting user input.
- **Exception for Identifiers:** Only acronyms or specific technical uppercase constants/identifiers (e.g. `TLS`, `ID`, `ENet`, `Caddy`) may remain capitalized inside metadata objects.

---

## 3. Data Structures & Caching (`Collection`)
- **Use `Collection` over Native `Map`:** Whenever caching, storing lists of players, game servers, worlds, or items, **ALWAYS** use the custom `Collection<K, V>` class imported from `src/utils/collection.ts` instead of standard JavaScript `Map`.
- **Benefits of `Collection`:** `Collection` extends `Map` with Array-like methods (`filter`, `find`, `map`, `reduce`, `some`, `every`, `random`, `first`, `last`, `toArray`), enabling clean utility operations without converting `Map` to Array manually.

```typescript
// ❌ Avoid using raw Map:
// private players: Map<number, Player> = new Map();

// ✅ Always use Collection:
import { Collection } from "../../utils/collection";
public players: Collection<string, Player> = new Collection();
```

---

## 4. Database Architecture & CRUD Services (`src/database`)
- **Query Builder & Dialect:** Built on **Kysely** with **LibSQL / Turso** (`kysely-turso/libsql` + `@libsql/client`), stored locally in `data/local.db`.
- **Database Schema & Types:** All table definitions and types are located in `src/database/tables/` (`players.ts`, `accounts.ts`, `sessions.ts`, `worlds.ts`, etc.) and exported from `src/database/tables/index.ts`.
  - Column naming convention: **`lowercase / snake_case`** (e.g., `created_at`, `updated_at`, `deleted_at`, `display_name`, `player_id`).
- **Timestamps & Soft Delete:**
  - Standard timestamp columns: `created_at`, `updated_at`, and `deleted_at`.
  - Read queries MUST always check `where("deleted_at", "is", null)` unless explicitly querying soft-deleted records.
- **Dedicated CRUD Services (`src/database/services/`):**
  - `PlayerDB` (`src/database/services/player-db.ts`): Case-insensitive username lookup, atomic gem/XP operations, device ID queries (`mac`, `ip`, `gid`, `rid`), and soft delete.
  - `AccountDB` (`src/database/services/account-db.ts`): Better-Auth style credential account management and authentication queries.
  - `SessionDB` (`src/database/services/session-db.ts`): Active session token tracking and cleanup.
  - `WorldDB` (`src/database/services/world-db.ts`): World SQL metadata management and atomic binary MAP_DATA storage.

---

## 5. Static Asset Embedding & Standalone Executable Compatibility
- **Single-Executable Compilation (`bun build --compile` / `bun run compile`):** To ensure GrowServer compiles seamlessly into a single standalone binary without external file dependencies:
  - **No Dynamic Filesystem I/O for Bundled Assets:** NEVER use dynamic directory scanning (`fs.readdir`), runtime path resolution (`import.meta.resolve`), or runtime `fs.readFile` for core assets.
  - **HTML Templates & Configs Embedding (`src/resources/`):** All HTML portal templates (`src/resources/web/`) and configuration templates (`src/resources/caddy/`, `src/resources/custom-items/`) MUST be statically imported using Bun import attributes and registered in `src/resources/index.ts` (`HTML_TEMPLATES`, `EMBEDDED_CONFIGS`, `EMBEDDED_CUSTOM_ITEMS`).
  - **WASM Core Binary Embedding (`src/services/wasm-binary.ts`):** WebAssembly core binaries (`growtopia_wasm_bg.wasm`) MUST be statically embedded (e.g. in `src/services/wasm-binary.ts`) and loaded directly into memory without requiring external `node_modules` paths at runtime.
  - **Static In-Code Migration Provider:** All database migrations in `src/database/migrations/` MUST be statically imported and registered in `src/database/migrations/index.ts`.
- **First-Time Auto-Setup in Clean Environments:** When `growserver.exe` runs for the first time in an empty directory (detected via `isInitialSetupNeeded()` in `src/scripts/setup.ts`), it automatically executes `runSetup({ skipWiki: false, destroyDbOnFinish: false })` before starting servers. Wiki generation must never be skipped as game server features depend on it. On subsequent runs, setup is skipped and the server starts in ~1s.
- **Executing Migrations:** Run migrations via `bun run migrate:latest`, `growserver migrate`, or call `runMigrations()` during server bootstrap before opening network listeners.

---

## 6. Runtime & Platform Detection (`src/utils/runtime.ts`)
- **Centralized Runtime Detection:** Always use utilities from `src/utils/runtime.ts` rather than ad-hoc runtime checks:
  - `isCompiled()`: Detects whether the server is running as a standalone compiled binary (`growserver.exe` / `growserver`) by checking Bun virtual filesystem prefixes (`~BUN`, `$bunfs`) and `process.execPath`.
  - `isBunRuntime()`: Detects if running via Bun CLI interpreter (`bun run ...`).
  - `getRuntimeMode()`: Returns `"compiled" | "bun"`.
  - `getPlatformInfo()`: Returns normalized operating system and architecture (`os`, `arch`, `isWindows`, `isMac`, `isLinux`, `isZip`).

---

## 7. Caddy HTTPS Reverse Proxy & Local Development (`src/utils/caddy.ts`)
- **Purpose:** Caddy acts as the local development reverse proxy terminating HTTPS on port 443 (`https://www.growtopia1.com:443` -> `localhost:17900`) and dashboard/CDN domains (`login.growserver.test` -> `localhost:17901`, `cdn.growserver.test` -> `localhost:17902`).
- **Binary Resolution Priority:**
  1. Local project cache: `.cache/bin/caddy.exe` (or `.cache/bin/caddy` on Unix).
  2. System PATH: Absolute executable path resolved via `where.exe caddy` (Windows) or `which caddy` (Unix). Never spawn with `shell: true` so the process tree can be killed cleanly without leaving orphan instances on Ctrl+C.
- **Auto-Generation & Local Overwrite (`configs/caddy/`):** Caddy configuration files are managed under `configs/caddy/` (`configs/caddy/Caddyfile.dev` and `configs/caddy/Caddyfile`). `ensureCaddyfile(filename)` checks if `configs/caddy/<filename>` exists. If not found, it automatically generates it from the embedded default template (`EMBEDDED_CONFIGS`); if found, it loads the local file, overwrites the in-memory `EMBEDDED_CONFIGS`, and uses the local file for Caddy.
  - `stopExistingCaddy()`: Pre-flight check before spawning Caddy to terminate any lingering instances (via admin API `POST http://127.0.0.1:2019/stop` and `taskkill`) to prevent port 2019/443 bind conflicts.
  - Subprocesses spawned via `spawnCaddy()` or `src/scripts/caddy.ts` MUST trap `SIGINT`, `SIGTERM`, `SIGBREAK`, and `exit` to terminate the process tree synchronously (`taskkill /pid <pid> /t /f`) and prevent zombie background servers.
- **Automation Policy & Redirect Blocks:**
  - Always write HTTP-to-HTTPS redirect blocks using `http://<domain>` (e.g. `http://cdn.growserver.test`). NEVER declare `https://<domain>` for redirect blocks without matching TLS directives, as this triggers ambiguous automation policy errors in Caddy and causes infinite redirect loops.

---

## 8. CLI Commands & Process Lifecycle (`src/index.ts`)
- **Commander CLI Structure:**
  - `start`: Starts game server, HTTP endpoints, and login server (production mode).
  - `start:local`: Starts game server, HTTP endpoints, login server, AND Caddy HTTPS reverse proxy (`Caddyfile.dev`) concurrently for local development.
  - `setup`: Orchestrates initial environment verification, TLS certificates, database migrations, items.dat resolution, player tribute compilation, and wiki metadata. Supports `--with-caddy` and `--skip-wiki`.
  - `doctor`: Diagnoses system requirements, runtime mode, and Caddy availability.
  - `migrate`: Applies pending database migrations to `data/local.db`.
  - `wiki`: Scrapes Growtopia Wiki and generates `.cache/wiki.json`.
- **Graceful Shutdown:** `setupGracefulShutdown()` handles `SIGINT` (Ctrl+C) and `SIGTERM` signals, ensuring all background child processes (Caddy) and database connections are closed before calling `process.exit(0)`.

---

## 9. World Binary Storage & MAP_DATA Guidelines
- **Deterministic Sharded Storage:** World binary MAP_DATA files (`.bin`) are stored in `data/worlds/<first_char>/<world_name>.bin` (e.g., `data/worlds/s/start.bin`, `data/worlds/0-9/123farm.bin`).
- **Atomic File Writes:** Always write world binary buffers using atomic temporary file swaps (`.tmp` -> `fs.rename`) to prevent data corruption during unexpected server shutdowns.
- **Multi-Tier World Access:**
  1. **L1 (Memory):** Active worlds in `Collection<string, World>`.
  2. **L2 (Disk):** Binary files on disk via `WorldDB.readBinary()`.
  3. **L3 (Procedural):** Generate a new world if neither exists.

---

## 10. Player Management & Centralized Storage
- **Use `Player` Class (`src/game/player/index.ts`):** Never store raw ENet `Peer` instances directly in caches or handlers.
- **Centralized Storage in `ServerManager`:** All connected `Player` instances across all sub-servers are centrally registered in `serverManager.players` (`Collection<string, Player>`).
- **Unique Player ID & Server Label:** Each `GameServer` has a unique `serverLabel` (e.g., `"server-17091"`). Each `Player` is assigned a unique global ID formatted as `${serverLabel}:${peer.id}` (e.g., `"server-17091:0"`).
- **Database `playerId` for Routing & Transfers:** Always use the persistent, unique database `player.playerId` (integer primary key from `players` table) for `OnSendToServer` packets, transfer sessions (`SubServerTransferSession.playerId`), and user identification rather than the transient `netID` (`peer.id`).
- **Player Properties:** Use `Player` to track user state, inventory, current world, position, and role flags.
- **Packet In-Game Debugging:** In `GameServer.onReceive()`, incoming packet types are mapped via `PACKET_TYPE[type]` and displayed via `player.variants.sendOnConsoleMessage()` using `TextColor` for immediate in-game protocol inspection during development.

---

## 11. Server Architecture, Load Balancing & Host Resolution
- **`ServerManager` Singleton:** Multi-port game server instances MUST be managed by `ServerManager` (`src/game/server/server-manager.ts`).
- **Load Balancing:** When handling `/growtopia/server_data.php` or sub-server transfers (`ltoken` logon), use `serverManager.getOptimalServer("least_connections")` to dynamically route players to the game server with the least active connections instead of hardcoding ports/labels.
- **Development Host Resolution:** In development (`NODE_ENV !== "production"`), `getServerAddress()` MUST always resolve to `"127.0.0.1"` for both `server_data.php` and `OnSendToServer` packets to avoid network binding mismatches. In production, it falls back to the configured `host` in `server.toml`.
- **Super Broadcast (SB):** Cross-server broadcasts must use `serverManager.broadcast(packet)` to send packets to ALL connected players across ALL running `GameServer` instances.
- **Cross-Server Messaging:** Direct messaging or player lookup across ports MUST use `serverManager.getPlayerByName(name)` or `serverManager.players.find(...)` which searches across all connected servers.

---

## 12. Configuration Management (`configs/server.toml`)
- **Auto-Generation:** If `configs/server.toml` (or `server.toml`) does not exist on startup, `loadServerConfig()` automatically generates a default `configs/server.toml` with default port listeners (`server_ports = [17091]`) and server host (`host = "127.0.0.1"`).
- **Safe Parsing:** Multi-port configuration (`server_ports`) is strictly validated against valid integer port ranges (`1` to `65535`).
- **Dynamic Getters for Host & Domain:**
  - `getLoginDomain()` and `HTTPS.LOGIN_URL` (dynamic getter) always resolve `server.login_domain` dynamically (fallback: `"login.growserver.test"`). Never bind `login_domain` statically at module import time before `loadServerConfig()` has completed.
  - `getServerAddress()` dynamically resolves `server.host` (or `"127.0.0.1"` in development).

---

## 13. Items Database & Wiki Cache Storage (`.cache/`)
- **Items Database (`.cache/items.dat`):**
  - Storage priority: `.cache/items.dat` -> `configs/items.dat` -> `items.dat`.
  - Automatic archive fallback: Fetched automatically from [StileDevs/itemsdat-archive](https://github.com/StileDevs/itemsdat-archive) via `latest.json` if not present.
- **Wiki Metadata Database (`.cache/wiki.json`):**
  - Generated via `src/scripts/generate-wiki.ts` by querying the Growtopia Fandom MediaWiki API (`/api.php?action=query&export=1&exportnowrap=1&titles=...`) in 50-item batches and parsing wikitext templates with `mwparser`.
  - **Even Item ID Filtering (`item.id % 2 === 0`):** Only primary items and blocks are scraped directly from the wiki (excluding odd seed IDs and `null_item` placeholders), cutting total API requests by ~52% (from 328 down to ~158 chunks).
  - **Splice & Combiner Recipes:**
    - `RecipeSplice`: Automatically maps block ingredient IDs to their respective seed IDs (`id % 2 === 0 ? id + 1 : id`).
    - `RecipeCombine` & `TableRecipeCombine`: Parses chemical combiner / transmutator recipes into structured `CombineRecipe` (`{ items: [{ id, amount }], resultAmount }`).
  - Rate-limited via `Bucket` (`src/utils/bucket.ts`, 4 req/sec) using HTTP GET to respect Fandom API limits and avoid Cloudflare 403 / 429 blocks.
  - On HTTP 429 detection: automatically pauses the bucket and retries with high priority (`priority = true`).
  - Scrapes recipes, item types, drop properties, and rarity into `.cache/wiki.json`.
  - Idempotent caching: if valid `.cache/wiki.json` exists on disk, scraping is bypassed and custom items are merged immediately.

---

## 14. Bun CLI & Command Execution Standards
- **Flag Placement for Watch Mode:** Bun CLI flags like `--watch` MUST be placed **BEFORE** the script file path:
  - ✅ `bun run --watch src/index.ts`
  - ❌ `bun run src/index.ts --watch` (places `--watch` inside `process.argv` instead of triggering Bun's file watcher).
- **Development Server & Background Caddy Daemon (`bun run dev`):** Managed via `src/scripts/dev.ts` without `concurrently`:
  - **Background Caddy Daemon:** Spawns Caddy as a background daemon (`caddy start --config configs/caddy/Caddyfile.dev`), freeing standard input (`stdin`) completely.
  - **Foreground Watch Server:** Spawns the main game server directly in the foreground (`bun run --watch src/index.ts`) with `stdio: "inherit"`, keeping `process.stdin` 100% interactive for the server CLI console.
  - **Automated Process Cleanup:** Traps `SIGINT`, `SIGTERM`, and `exit` to terminate the background Caddy daemon cleanly via `stopExistingCaddy()`.
  - **Standalone Caddy Commands:**
    - `bun run caddy:start`: Starts Caddy in background as a daemon.
    - `bun run caddy:stop`: Stops the running background Caddy daemon.
- **Building & Compiling Standalone Binaries:**
  - `bun run build`: Bundles the entire application into a single JavaScript distribution file (`dist/index.js`).
  - `bun run build:assets`: Compiles custom PNG items into RTTEX binaries, updates `.cache/custom-items.json`, and merges metadata into `.cache/wiki.json`.
  - `bun run compile`: Compiles the server into a self-contained standalone executable binary (`dist/growserver` or `dist/growserver.exe`).

---

## 15. Project Structure & Summary
- **Runtime:** Bun
- **Main Entrypoint:** `src/index.ts`
- **Interactive Server Console:** `ServerConsole` singleton (`src/cli/console.ts`)
- **Development Runner:** `src/scripts/dev.ts` (daemon Caddy + interactive watch server)
- **HTTP Server:** Hono (`src/services/https-server.ts`)
- **Login Server:** Hono (`src/services/login-server.ts`, port 17901)
- **CDN Server:** Hono (`src/services/cdn-server.ts`, port 17902)
- **Game Server:** ENet native binding via `growtopia.wasm`
- **Reverse Proxy:** Caddy (`src/utils/caddy.ts`, `.cache/bin/caddy.exe`, `Caddyfile.dev`)
- **Server Manager:** Singleton (`src/game/server/server-manager.ts`)
- **Utilities:** `src/utils/` (`collection.ts`, `bucket.ts`, `logger.ts`, `caddy.ts`, `runtime.ts`, `tls.ts`)
- **Database:** Kysely + LibSQL (`src/database/`, `data/local.db`)
- **Storage:** Atomic sharded binary files (`data/worlds/`)
- **Cache:** `.cache/` (e.g. `.cache/items.dat`, `.cache/wiki.json`, `.cache/tls/`, `.cache/bin/`, `.cache/player-tribute.dat`, `.cache/custom-items.json`)
- **Config:** `configs/server.toml`, `configs/player-tribute.toml`, `configs/caddy/`
- **Custom Items:** `resources/custom-items/` (compiled to `resources/cdn-static/`)

---

## 16. Player Tribute System & Configuration (`src/configs/player-tribute.ts`)
- **Configuration File (`configs/player-tribute.toml`):**
  - Manages honorees across 4 tabs: `[epic_players]` (Tab 1: Hall of Fame), `[special_tribute]` (Tab 2: Mentors/Grow4Good), `[yearly_honorees]` (Tab 3: Annual contributors), and `[[monthly_champions]]` (Tab 4: Ranked monthly podiums).
- **Binary Encoding & Serialization:**
  - Encoded into `player-tribute.dat` (stored in `.cache/player-tribute.dat`).
  - Serialized as 4 length-prefixed strings, each preceded by a 16-bit little-endian integer (`uint16_le`).
  - Auto-compiled during `bun run setup` (Step 5) or manually via `bun run src/configs/player-tribute.ts`.
- **Packet Transmission:**
  - Sent to game clients using `TANK_PACKET_TYPE.SEND_PLAYER_TRIBUTE_DATA` with the compiled binary buffer.

---

## 17. Custom Items, CDN Assets & Wiki Integration (`docs/custom-items.md`)
- **Directory Hierarchy as Asset Path:**
  - All custom items reside in `resources/custom-items/` (auto-generated from embedded templates in `src/resources/custom-items/` if missing).
  - The relative folder path from `resources/custom-items/` automatically defines the target `.rttex` asset path (e.g., `resources/custom-items/growserver/interface/banner/` compiles to `resources/cdn-static/growserver/interface/banner.rttex`).
  - Client requests are directed to `https://cdn.growserver.test/growtopia/<path>`.
- **Item Configuration (`conf.toml`):**
  - `id`: Target item ID in `items.dat` to modify or replace.
  - `target`: Target item field to override (`"extra_file"` or `"texture"`). If omitted, automatically determined: paths containing `/interface/` default to `"extra_file"`, while others default to `"texture"`.
  - `[item]`: Overrides for `ItemDefinition` properties (`name`, `texture_x`, `texture_y`, `type`, `body_part_type`, `visual_effect_type`).
  - `[wiki]`: Metadata merged into `.cache/wiki.json` (`name`, `desc`, `chi`, `play_mods`, `[wiki.recipe]`, `[wiki.func]`).
  - `[utils.func.image]`: Image transformations before RTTEX encoding (`resize = "1024x256"`, `fit = "fill" | "inside"`, `filter`, `rotate`, `flip`, `flop`, `modulate`, `png`).
- **Asset Compilation Pipeline (`bun run build:assets`):**
  - Built by `src/scripts/build-assets.ts`.
  - Applies native image transformations via `Bun.Image` according to `[utils.func.image]`.
  - Encodes `.png` files into `.rttex` via `RTTEX.encode()` and calculates hash via `RTTEX.hash()`.
  - Generates `.cache/custom-items.json` manifest.
  - Automatically merges item wiki metadata into `.cache/wiki.json`.
  - Automatically invoked during server boot in `initItems()` if the manifest does not exist.
- **CDN Server (`src/services/cdn-server.ts`):**
  - Serves static assets on port `17902` (reverse-proxied by Caddy on `cdn.growserver.test:443`).
  - Serves custom files from `resources/cdn-static/` (200 OK).
  - Falls back to upstream CDN (`https://growserver-cache.netlify.app`) with HTTP 302 redirect for any missing vanilla assets.

---

## 18. Token Bucket Rate Limiting (`Bucket`) (`src/utils/bucket.ts`)
- **Architecture & Origin:** Adapted from Eris (`Bucket.js`), providing an asynchronous token-bucket rate limiter with priority queuing, token burst allowance, and latency tracking.
- **Queueing & Priority Execution:**
  - `bucket.queue(func, priority)`: Normal requests append to the queue (`push`); critical tasks or retries specify `priority = true` to unshift to the front of the queue (`unshift`).
  - `bucket.execute<T>(asyncFunc, priority)`: Promise-wrapped helper that executes an asynchronous function when a token becomes available.
- **Use Cases & Rate-Limit Backoff:**
  - **Wiki Scraper:** Throttles MediaWiki API requests to 4 req/sec (`new Bucket(4, 1000)`) using HTTP GET, safely avoiding Cloudflare 429 Too Many Requests.
  - **Dynamic 429 Backoff:** When a 429 response is encountered, callers pause the bucket (`bucket.tokens = bucket.tokenLimit`, `bucket.lastReset = Date.now() + waitTime`) to let the remote rate-limit window clear before retrying with high priority.

---

## 19. Interactive Server Console CLI (`src/cli/console.ts`)
- **Architecture & Minecraft Parity:** Implements an interactive terminal console inspired by Minecraft server consoles, enabling operators to execute server commands directly from the terminal while the server is active.
- **Singleton Pattern & Collection Registry:**
  - Managed by `ServerConsole.getInstance()` (exported as `serverConsole`).
  - Registered commands (`commands`) and aliases (`aliases`) MUST strictly use `Collection<string, T>` imported from `src/utils/collection.ts`, strictly adhering to Section 3.
- **Command Definition Contract (`ConsoleCommand`):**
  - Each command implements `ConsoleCommand`: `name` (string), `description` (string), optional `usage` (string), `aliases` (string[]), and `execute(args: string[]): Promise<void> | void`.
  - Registered dynamically via `serverConsole.registerCommand(command)`.
- **Built-in Commands:**
  - `ping`: Verifies console responsiveness with a `pong` reply logged via `logger.info("pong")`.
- **Process Lifecycle Integration:**
  - Automatically started after all servers and network listeners are initialized (`serverConsole.start()` in `src/index.ts`).
  - Automatically detached and stopped during graceful shutdown (`serverConsole.stop()` in `setupGracefulShutdown()`).
  - Configured with `terminal: true` to ensure the prompt (`> `), character echoing, and cursor navigation function reliably across different terminal environments.

