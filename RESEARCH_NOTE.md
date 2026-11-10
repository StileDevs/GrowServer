# GrowServer Feature Research & Reverse-Engineering Guide (`RESEARCH_NOTE.md`)

This document captures the workflow, trusted sources, query recipes, data reliability hierarchy, and packet-sniffing criteria established while researching and implementing Growtopia gameplay systems (Fishing, Surgery, Geiger, Quests, Cooking, and Tile Extras).

---

## 1. Trusted Sources & Hierarchy of Truth

Not all Growtopia reference sources are equally reliable for every piece of data. Open-source C++ servers (`GTOS`, `itskyy`, `GrowtopiaServer`) frequently hardcode placeholder item IDs, simplified tile-extra serializers, or custom private-server tweaks. Always cross-check against the hierarchy below:

| Priority | Source | Location / URL | Best Used For | Known Pitfalls |
| :--- | :--- | :--- | :--- | :--- |
| **1 (Ground Truth)** | **Decoded `items.dat`** | `.cache/items.dat` (via `grow-items` / `initItems()`) | Exact `id`, `name`, `type` (`ActionTypes`), `flags`, `flags2`, `collisionType`, `breakHits`, `growTime`, `clothingType`, `rarity`. | Tells you *what* an item is, not *how* its server logic or tile extra binary payload works. |
| **2 (Binary Layouts)** | **`badewen/Growtopia-Things`** | `https://github.com/badewen/Growtopia-Things` (`parsers/world_parser.ksy`, `parsers/world_parser.py`, `parsers/TileExtra.h`) | **Exact binary layout of `TileExtra` (`SEND_MAP_DATA` / `SEND_TILE_UPDATE_DATA`)**. Built from real live-server world dumps. | Covers up to ~v4.x/v5.x tile extras; brand-new extra types (`> 74`) may still need a live dump. |
| **3 (Codebase Reference)** | **GrowServer `default-extra-tile.ts`** | `src/game/world/tiles/default-extra-tile.ts` | Verified byte lengths for empty tile extra payloads (world version 25 / `items-v5.61.dat`) and list of `UNSUPPORTED_EXTRA_TYPES` where open-source parsers disagree. | Only stores the *empty/default* byte array; variable-length payloads (like `OVEN = 55` with ingredients) must be checked against `world_parser.ksy`. |
| **4 (Data Tables & Dialogs)** | **ItsKyy (`gtps-v8`) Source** | Local: `Reference/itskyy source.rar`<br>GitHub: `https://github.com/jaaakee/gtps-v8` | Complete data lookup tables (`Base.h`), dialog builders (`Dialog.h`), tile state structs (`Tile.h`), role quest tables, and store catalogs (`53785`, etc.). | **Beware of wrong item IDs in C++ code!** (e.g., `itskyy` wrote `item == 4562` (Flour) where `4582` (Food Grinder) was meant, and `4672` (Avocado) where `4612` (Mac n' Cheese Star) was meant). Always verify every numeric ID against `.cache/items.dat`. |
| **5 (Gameplay Loops & Packets)** | **GTOS v2.0.35 Source** | Local: `Reference/Source Code GTOS v2.0.35.zip`<br>GitHub: `https://github.com/Realznx/GTOS` | Complete gameplay state machines (Surgery, Fishing, Geiger, Combiners/Labs, PlayMods, Consumables, Lock permissions, Tank packet flags). | Monolithic files (`world.h` ~490 KB, `gt.cpp` ~670 KB, `dialog_handler.h` ~220 KB). Uses simplified fixed-size tile extra serializers that can crash modern clients if copied blindly. |
| **6 (Classic C++ Servers)** | **`Hirako2000/GrowtopiaServer`** & **`RebillionXX/GrowtopiaServer`** | `https://github.com/Hirako2000/GrowtopiaServer`<br>`https://github.com/RebillionXX/GrowtopiaServer` | Clean `PlayerMoving` / `GameUpdatePacket` field mappings, `OnTalkBubble` / `OnParticleEffect` / `OnPlayPositioned` SFX names, and classic consumable/playmod strings. | Missing newer mechanics and often uses placeholder formulas. |
| **7 (Recipes & Descriptions)** | **Local `.cache/wiki.json` & Growtopia Wiki** | `.cache/wiki.json`<br>`https://growtopia.fandom.com/wiki/` | Exact recipe timings, splice pairs, 3-item combine recipes, item descriptions, role perks, and buff percentages. | **Scraper artifact warning:** In `.cache/wiki.json`, if an item's wiki page has a *"Used In"* combine table instead of a *"Created By"* combine table (e.g., `Dough`, `Bread`), the scraper records a self-referential recipe where `info.id` appears inside `recipe.combine.items`. Always filter out `combine.items.some(i => i.id === info.id)`! |

---

## 2. How to Query Each Source Effectively

### A. Querying `.cache/items.dat` (Always Do This First)
Never guess an item ID or action type from C++ source code. Run a one-line `bun -e` script against `initItems()` to inspect the real `items.dat` metadata:

```powershell
# Search items by name pattern or action type
bun -e 'import { initItems, items } from "./src/game/item/item-info"; await initItems(); for (const [id, it] of items.meta.items) { if (/oven|grinder|salsa|guacamole/i.test(it.name || "") || it.type === 98) console.log(id, it.name, "type:", it.type, "flags:", it.flags); }'

# Lookup specific item IDs found in GTOS / itskyy C++ code
bun -e 'import { initItems, items } from "./src/game/item/item-info"; await initItems(); for (const id of [952, 3470, 4498, 4560, 4582, 4612, 4618, 4620, 6412, 10820]) { const it = items.meta.items.get(id); console.log(id, "=>", it?.name, "type:", it?.type, "clothingType:", it?.bodyPartType); }'
```

### B. Querying `.cache/wiki.json`
Use `.cache/wiki.json` to inspect descriptions, playMods, splice recipes, and chemical combiner recipes:

```powershell
bun -e 'import { readFileSync } from "fs"; const wiki = JSON.parse(readFileSync(".cache/wiki.json", "utf8")); for (const w of wiki) { if (w.id >= 4560 && w.id <= 4625) console.log(w.id, w.name, w.recipe, w.playMods, w.desc); }'
```

### C. Querying Local Archives in `Reference/` (`GTOS` & `itskyy`)
Windows ships with `tar.exe` (libarchive), which natively lists and extracts both `.zip` and `.rar` archives without needing third-party tools:

```powershell
# List files in Reference archives
tar -tf "Reference/Source Code GTOS v2.0.35.zip"
tar -tf "Reference/itskyy source.rar"

# Extract to a temporary directory outside the repo for fast searching
New-Item -ItemType Directory -Force -Path "$env:TEMP\gt_refs\gtos", "$env:TEMP\gt_refs\itskyy" | Out-Null
tar -xf "Reference/Source Code GTOS v2.0.35.zip" -C "$env:TEMP\gt_refs\gtos"
tar -xf "Reference/itskyy source.rar" -C "$env:TEMP\gt_refs\itskyy"

# Search extracted C++ files with Select-String
Select-String -Path "$env:TEMP\gt_refs\gtos\*\*.h", "$env:TEMP\gt_refs\gtos\*\*.cpp" -Pattern "homeoven_edit|grinder|952|4582"
Select-String -Path "$env:TEMP\gt_refs\itskyy\*\*.h", "$env:TEMP\gt_refs\itskyy\*\*.cpp" -Pattern "grind_item|Oven|cook"
```

### D. Querying GitHub References (`gh` CLI & Raw Fetch)
When searching across GitHub for a dialog name, variant name, or tile extra structure:

```powershell
# Search code across GitHub for specific Growtopia dialog names or packet strings
gh api "search/code?q=homeoven_edit+language:C%2B%2B" --jq '.items[] | "\(.repository.full_name): \(.path)"'

# Fetch Kaitai Struct / Python world parsers from badewen/Growtopia-Things
curl -s "https://raw.githubusercontent.com/badewen/Growtopia-Things/master/parsers/world_parser.ksy"
curl -s "https://raw.githubusercontent.com/badewen/Growtopia-Things/master/parsers/world_parser.py"
```

---

## 3. What Data Is Most Valuable in Each Source

### 1. `badewen/Growtopia-Things` (`parsers/world_parser.ksy` & `world_parser.py`)
- **Why it is critical:** Growtopia's client parses `SEND_MAP_DATA` and `SEND_TILE_UPDATE_DATA` sequentially with zero bounds checking on tile extra payloads. **A single missing or extra byte in `Tile.serialize()` will immediately crash the Growtopia client when entering the world or updating a tile.**
- **What to look at:**
  - The `tile_extra` switch table in `world_parser.ksy` (keyed by `TileExtraTypes` byte `1..81`).
  - Whether a field is `u1` (`u8`), `u2le` (`u16`), `u4le` (`u32`), or a length-prefixed string (`u2le` length + ASCII bytes).
  - Variable-length list multipliers! For example, in `oven` (extra type `55`):
    ```yaml
    oven:
      seq:
        - id: temp_level
          type: u4
        - id: ingredient_list_size
          type: u4
        - id: ingredients
          type: ingredient
          repeat: expr
          repeat-expr: ingredient_list_size / 2
        - id: unk1
          type: u4
        - id: unk2
          type: u4
        - id: unk3
          type: u4
    ```
    Notice `repeat-expr: ingredient_list_size / 2`! That reveals `ingredient_list_size` is the count of `u32` integers (`ingredients.length * 2`), **not** the number of ingredients. Without checking `world_parser.ksy`, writing `ingredients.length` would corrupt the stream and crash the client as soon as an ingredient is added.

### 2. `itskyy/gtps-v8` (`Base.h`, `Dialog.h`, `Tile.h`)
- **Why it is valuable:** Organizes item tables into clean C++ `std::map` / struct initializers instead of deeply nested `if/else` chains.
- **What to look at:**
  - `Base.h`: `grind_item` map (25 Food Grinder recipes with input counts and output item IDs), role quest XP/level tables, fishing/mining pools.
  - `Dialog.h`: Exact `DialogBuilder` layouts, embedded hidden fields (`add_custom_margin`, `embed_data|tilex|...`, button names), and store tabs.
  - `Tile.h`: Per-tile state variables needed at runtime.

### 3. `GTOS v2.0.35` (`world.h`, `gt.cpp`, `dialog_handler.h`)
- **Why it is valuable:** Has the most complete end-to-end player interaction flows.
- **What to look at:**
  - **`world.h`**:
    - `ITEM_CHANGE_OBJECT` modes (`netID = -1` new drop, `netID = -2` remove drop by `uid`, `netID = -3` update existing drop count in `float_var` at byte offset `20`).
    - Consumable effects, `PlayMod` add/remove messages, skin color tints (`0xRRGGBBAA`), character state bitflags (`CHARACTER_STATE`), and audio/particle IDs (`OnPlayPositioned`, `OnParticleEffect`).
    - 3-item combiner logic (`Laboratory` `932`, `E-Z Cook Oven` `952`, `Microwave` `1472`, etc.).
  - **`dialog_handler.h`**:
    - Button names (`buttonClicked`) and input fields returned by the client when submitting dialogs (`grinder`, `homeoven_edit`, `surgery`, `vending`, `lock_edit`).

---

## 4. When to Do a Live Packet Sniff Instead of Searching Code

Open-source C++ references should **not** be trusted—and you should switch to a **live packet capture / world dump** (using tools like `gtproxy`, `badewen/Growtopia-Things`, or Wireshark/ENet MITM)—in the following situations:

1. **Conflicting or Unknown Tile Extra Layouts (`UNSUPPORTED_EXTRA_TYPES`)**
   - When `src/game/world/tiles/default-extra-tile.ts` lists an `ActionType` in `UNSUPPORTED_EXTRA_TYPES` (such as `ActionTypes.SWING` / Sewing Machine, `ActionTypes.PORTRAIT`, `ActionTypes.FISHGOTCHI_TANK`, `ActionTypes.ITEM_PLANTER`, `ActionTypes.AUTO_ACTION_HARVEST` / Heart of Gaia), open-source repos disagree on the byte length (e.g., `u16` vs `u32` count, or 22 vs 26 vs 32 bytes).
   - **Action:** Capture a single `SEND_MAP_DATA` (type `4`) or `SEND_TILE_UPDATE_DATA` (type `5`) packet from a world containing that block on a live server and inspect the exact bytes after the 8-byte tile header.

2. **Client-Side Visual State Driven by Undocumented `TileExtra` Fields or `TileFlags`**
   - Some blocks animate or change sprites purely based on undocumented fields in their extra data or `GameUpdatePacket` fields (e.g., how `OVEN` `55` uses `unk1`/`unk2`/`unk3` or how `SEND_LOCK` / `SEND_PARTICLE_EFFECT` encodes colors and flags in `posX`/`posY`/`speedX`).
   - If the block works mechanically on the server but the client sprite does not animate (e.g., oven fire glow, provider progress bar, weather machine settings), sniff `SEND_TILE_UPDATE_DATA` (type `5`) during the transition.

3. **Client-Initiated Custom Packet Types (`TANK_PACKET_TYPE > 30` or Custom `action|` Strings)**
   - Older C++ servers only handle standard `TILE_CHANGE_REQUEST` (`3`), `STATE` (`0`), `ITEM_ACTIVATE_REQUEST` (`10`), and `dialog_return`.
   - Newer Growtopia systems (e.g., Dungeon/Role interfaces, Clash events, Startopia UI, Sewing Machine UI, Fishgotchi) sometimes send specialized `action|` strings or tank packet types when clicking custom client UI buttons.
   - **Action:** Log incoming `PACKET_TYPE.GENERIC_TEXT` (`2`), `PACKET_TYPE.GAME_MESSAGE` (`3`), and `PACKET_TYPE.GAME_PACKET` (`4`) in `src/game/network/` while clicking the UI in the client to see the exact payload the client sends.

4. **Exact Particle Effect IDs, Custom Audio Paths, and Variant Argument Orders**
   - Open-source servers frequently reuse generic particles (like `44` or `46`) and generic sounds (`audio/success.wav`).
   - If you want 1:1 visual/audio fidelity with official servers for a specific item's `OnParticleEffect`, `OnPlayPositioned`, or `OnSetClothing` / `SetCharacterState` bitflags, a packet log from the official server gives the exact integer IDs and `.wav` paths in seconds.

---

## 5. Checklist When Implementing Any New Feature in GrowServer

1. **Verify all Item IDs & ActionTypes in `.cache/items.dat`** first using `bun -e`.
2. **Check `ActionTypes` -> `TileExtraTypes` mapping**:
   - Does the block require `TileFlags.TILEEXTRA` (`0x0001`)?
   - Check `src/game/world/tiles/default-extra-tile.ts` and `badewen/Growtopia-Things/parsers/world_parser.ksy` for the exact binary layout.
3. **Check `TileChangeRequest` Dispatch Order in `src/game/network/tank-handler.ts`**:
   - Many items used as inputs for appliances (e.g., `Egg`, `Milk`, `Tomato`, `Water Bucket`, `Fishing Baits`) have `ActionTypes.CONSUMABLE` (`20`)!
   - Appliance handlers (`loadLobsterTrap`, `handleFoodGrinderUse`, `handleOvenItemPlace`) **must** run *before* `if (type === ActionTypes.CONSUMABLE)` and `handleFishingCast`, otherwise the player will eat/throw the ingredient or flood the tile instead of loading the appliance.
4. **Verify TypeScript Compilation & Code Style (`AGENTS.md`)**:
   - Use `Collection` from `src/utils/collection.ts` instead of native `Map`.
   - Keep all `logger` messages 100% lowercase.
   - Run `bunx tsc --noEmit` to ensure zero type errors before committing.
