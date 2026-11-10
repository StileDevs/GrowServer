# MAGPLANT 5000: ItsKyy and V8 reference implementation

The primary references are the local archives `Reference/CPP ITSKYY V29 LATEST.rar`
and `Reference/V8 7Jan.rar`. Their C++ sources are extracted under the ignored
`.cache/oven-reference/` directory. GTOS is no longer the behavior or packet
reference for this feature.

## Why V8 supplies the item mapping

ItsKyy V29 remaps the main MAGPLANT implementation to item 10266 and expands its
storage capacity in some paths. V8 explicitly handles retail item 5638 with
5000-item capacity. GrowServer uses the shared ItsKyy/V8 item-sucker flow and
V8's explicit 5638 branch, rather than importing private-server item remaps.

## Source mapping

- ItsKyy `ItsKyyStore/World.h:16913` and V8 `World.h:18242`, `get_sucker`:
  `itemsucker_block` dialog, picker `selectitem`, buttons `additem`,
  `retrieveitem`, `clearitem`, and `getplantationdevice`, plus collection
  checkbox `chk_enablesucking`.
- ItsKyy `World.h:25106` and V8 `World.h:26351`: configure a target, enable
  collection, clear an empty selection, and issue a remote with
  `OnPlanterActivated(itemId, x, y)`. Multiple machines may target the same item.
- V8 `World.h:26227`: amount confirmation dialogs `itemaddedtosucker`
  (`itemtoadd`) and `itemremovedfromsucker` (`itemtoremove`). Item selection
  configures collection without depositing the selected stack.
- V8 `World.h:35012`: an owner punch after a pause toggles building mode and
  activates/deactivates the remote. Continued punches break an empty machine.
  Building mode controls visitor remote access. Collection is independent.
- V8 `World.h:7373`, `form_visual`: 15-byte extra type 62 with `u32 itemId`,
  **actual** `u32 stock`, collection byte, building-mode byte, reserved zero,
  `u16 capacity=5000`, and final reserved zero. Capacity starts at extra offset
  12; it is not an ordinary u32 immediately after the mode flags.
- V8 `World.h:33397`, `use_mag`: enabled matching machines collect generated
  items with subtype-6 item animation directed into the machine. GrowServer
  retains stable persisted tile order for machine priority.

## Using the implementation

Place 5638 in a World-Locked world as its owner. Wrench and choose an owned item.
Collection starts enabled. Add backpack stock through the amount dialog or
collect drops from breaking blocks and harvesting. Retrieve the desired amount
through the matching amount dialog. Disable collection with its checkbox.

Punch the machine once to activate building mode and receive remote 5640.
Visitors can obtain a remote while building mode is active. Punch again after
the punch reset interval to disable building and revoke bound remotes. Ordinary
build permissions still apply to remote placement. Seeds and backgrounds use
their existing GrowServer placement handlers.

Empty the machine before changing its target or breaking it. Rapid continued
punches damage an empty machine after the initial building-mode toggle.

The GTOS gem-mode checkbox and public-remote checkbox have been removed.
Previously stored gems remain retrievable as currency, then the owner can clear
the selection. Old stock is preserved; missing mode fields default to collection
enabled and building disabled.

## Integration safeguards and differences

- Capacity is enforced on additions and collection, with excess drops preserved.
- Withdrawals obey GrowServer's 200-item stack and deduct only accepted items.
- Amounts must be positive safe integers. Amount dialogs carry selected-item
  and machine-instance embeds so a stale dialog cannot transfer another item.
- Owners/developers configure and transfer storage. Remote binding validates
  access even when a player already owns a token.
- Collection uses explicit block/harvest provenance. Manual drops, rewards,
  and existing floor items are not swept into storage.
- Untradeable items and rarity-999 items remain rejected; the reference's custom
  farmable exceptions are not imported without corresponding item metadata.
- Live remote bindings are revoked on departure, replacement, reconfiguration,
  loss of the World Lock, or visitor access loss. Saved tokens are removed at
  login. Asynchronous placement revalidates the machine, target, mode, and stock
  before consumption to prevent duplication.
- Reference defects such as V8's inconsistent `spin`/`magnetron` dialog label
  and collection checkbox toggle expression are corrected: dialog and packets
  read the same stored modes, and submitted checkbox values apply directly.

## Verification

Regression tests cover exact payload bytes at empty/partial/full stock,
reference dialog controls, transfers and capacity, malformed/stale submissions,
collection provenance and modes, duplicate selections, remote permissions,
foreground/background/seed placement, concurrent placement, and legacy state.

Real-client verification remains necessary for visual states, collection
animation, punch interaction, remote icon, and save/restart behavior.
