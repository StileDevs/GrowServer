import type { ItemDefinition } from "grow-items";
import { DialogBuilder } from "../../utils/dialog-builder";
import { logger } from "../../utils/logger";
import { AccountDB } from "../../database/services/account-db";
import { PlayerDB } from "../../database/services/player-db";
import { WorldDB } from "../../database/services/world-db";
import { registerDialog } from "../network/dialog-handler";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { serverManager } from "../server/server-manager";
import { ITEM_ID, LockPermission, TileFlags } from "../world/constants";
import { tileFrom } from "../world/tiles";
import type { TileData } from "../world/types";
import type { World } from "../world/world";
import { worldManager } from "../world/world-manager";
import { getItem } from "./item-utils";

/** Items with their own behaviour. */
const CONSUMABLE_ID = {
  EXPERIENCE_POTION: 1488,
  FIREWORKS: 834,
  FIREWORKS_ALT: 1406,
  MEGAPHONE: 2480,
  DOOR_MOVER: 1404,
  LOCK_MOVER: 3560,
  BIRTH_CERTIFICATE: 1280,
  CHANGE_OF_ADDRESS: 2580,
  WATER_BUCKET: 822,
} as const;

/** What a consumable does when used on the person standing on the tile. */
interface ConsumableEffect {
  /** `consume`: eaten with a bubble; `apply`: grants a play mod; `throw`: hits with a particle effect. */
  action: "consume" | "apply" | "throw";
  /** Play mod granted to the target. */
  mod?: string;
  /** Particle effect played on the target. */
  effectId?: number;
  /** Bubble shown over the target. */
  bubble?: string;
}

const YUM: ConsumableEffect = { action: "consume", bubble: ":D`#YUM!``" };

/** Generic consumables, keyed by item id; mirrors the official effect list. */
const CONSUMABLES: Partial<Record<number, ConsumableEffect>> = {
  // snacks
  3404: YUM, 3406: YUM, 4422: YUM, 950: YUM, 968: YUM, 1058: YUM, 1096: YUM, 868: YUM, 4668: YUM, 1094: YUM, 1098: YUM, 4378: YUM, 1374: YUM, 406: YUM, 966: YUM, 958: YUM, 1580: YUM, 7052: YUM, 8520: YUM, 3546: YUM, 3600: YUM, 3836: YUM, 3240: YUM, 4984: YUM, 2734: YUM, 3622: YUM, 10988: YUM, 4764: YUM, 964: YUM, 3428: YUM, 4752: YUM, 3816: YUM, 1208: YUM,
  3536: { action: "consume", bubble: "Mmm, sugar!" },
  4410: { action: "consume", bubble: ":P`#Bleh.``" },
  // play mods
  388: { action: "apply", mod: "stinky" },
  614: { action: "apply", mod: "stinky" },
  4602: { action: "apply", mod: "stinky" },
  1368: { action: "apply", mod: "frozen" },
  274: { action: "apply", mod: "frozen" },
  6314: { action: "apply", mod: "frozen" },
  2206: { action: "apply", mod: "irradiated" },
  408: { action: "apply", mod: "duct_tape" },
  384: { action: "apply", mod: "valentine" },
  528: { action: "apply", mod: "lucky" },
  1056: { action: "apply", mod: "lucky" },
  750: { action: "apply", mod: "lucky" },
  540: { action: "apply", mod: "envious" },
  4672: { action: "apply", mod: "envious" },
  196: { action: "apply", mod: "feelin_blue" },
  338: { action: "apply", mod: "floating" },
  1772: { action: "apply", mod: "floating" },
  782: { action: "apply", mod: "antidote" },
  128: { action: "apply", mod: "golden_halo" },
  764: { action: "apply", mod: "infected" },
  126: { action: "apply", mod: "devil_horns" },
  1964: { action: "apply", mod: "devil_horns" },
  960: { action: "apply", mod: "on_fire" },
  712: { action: "apply", mod: "on_fire" },
  1988: { action: "apply", mod: "haunted" },
  1634: { action: "apply", mod: "caffeinated" },
  4766: { action: "apply", mod: "blushing_red" },
  1474: { action: "apply", mod: "extra_xp" },
  6906: { action: "apply", mod: "composer", bubble: ":D`#YUM!``" },
  // thrown
  368: { action: "throw", mod: "muddy", effectId: 42 },
  874: { action: "throw", mod: "egged", effectId: 42 },
  962: { action: "throw", mod: "saucy", effectId: 45 },
  3064: { action: "throw", effectId: 34, bubble: "`wSPLASH!``" },
};

/** Shortest time between two consumable uses per player. */
const USE_COOLDOWN_MS = 350;
const lastUse = new WeakMap<Player, number>();

/** Growth (in seconds) a spray adds to the tree on the used tile, keyed by item id. */
const TREE_SPRAY_SECONDS: Partial<Record<number, number>> = {
  228: 3_600, // Grow Spray Fertilizer
  1062: 2_592_000, // Ultra Grow Spray
  1778: 86_400, // Deluxe Grow Spray
  5764: 86_400, // Lunar Spice Spray
  10672: 3_600, // My First Grow Spray Fertilizer
};

/** Growth (in seconds) a spray adds to every growing tree in the world, keyed by item id. */
const WORLD_SPRAY_SECONDS: Partial<Record<number, number>> = {
  12600: 2_592_000, // Ultra World Spray
  13574: 86_400, // Deluxe World Spray
};

/** Growth (in seconds) a spray adds to a provider on the used tile, keyed by item id. */
const PROVIDER_SPRAY_SECONDS: Partial<Record<number, number>> = {
  10290: 21_600, // Provider Spray (6 hours)
};

/** Experience granted by an Experience Potion. */
const EXPERIENCE_POTION_XP = 10_000;
/** Particle effect of fireworks. */
const FIREWORKS_EFFECT = 40;
/** Rules for a new GrowID. */
const GROWID_PATTERN = /^[a-zA-Z0-9]{3,18}$/;

/** The player standing on a tile, if any. */
function playerAt(world: World, tileX: number, tileY: number): Player | undefined {
  return world.players.find((other) => Math.floor((other.state.x + 10) / 32) === tileX && Math.floor((other.state.y + 15) / 32) === tileY);
}

function bubbleToWorld(world: World, target: Player, message: string): void {
  for (const other of world.players) other.variants.sendOnTalkBubble(target.netID, message, false);
}

/**
 * Whether the player may use world-owner items (door mover, lock mover,
 * address change) here: the world must be world-locked by this player.
 */
function ownsWorld(player: Player, world: World): boolean {
  const owner = world.getOwnerPlayerId();
  return owner !== undefined && owner === player.playerId;
}

/**
 * Water Bucket: floods an empty tile or scoops the water back out (the
 * reference toggles the water tile flag). Filling consumes the bucket;
 * emptying has a 50% chance to return it. Main doors and bedrock can never
 * be flooded.
 */
async function useWaterBucket(player: Player, world: World, tileX: number, tileY: number): Promise<void> {
  const block = world.getTileAt(tileX, tileY);
  if (!block) return;

  const targetItem = block.fg || block.bg;
  if (targetItem === ITEM_ID.MAIN_DOOR || targetItem === ITEM_ID.BEDROCK) return;

  if (!(await world.hasTilePermission(player, block, LockPermission.BUILD))) {
    player.sendTextBubble("You don't have permission to do that here!", true);
    return;
  }

  if ((block.flags & TileFlags.WATER) !== 0) {
    block.flags &= ~TileFlags.WATER;
    if (Math.random() < 0.5) player.addItemInven(CONSUMABLE_ID.WATER_BUCKET, 1);
    player.sendTextBubble("You scooped the water back up.", true);
  } else {
    if (player.removeItemInven(CONSUMABLE_ID.WATER_BUCKET, 1) <= 0) return;
    block.flags |= TileFlags.WATER;
    player.sendTextBubble("You poured out the water.", true);
  }

  world.playPositioned("audio/splash.wav", player.netID);
  tileFrom(world, block).tileUpdate();
  world.markDirty();
}

/**
 * Uses a consumable on a tile: special items first, then the generic
 * effect list. The item is only taken from the backpack when it worked.
 */
export async function useConsumable(player: Player, world: World, item: ItemDefinition, tileX: number, tileY: number): Promise<void> {
  const itemId = item.id ?? 0;
  if (!player.inventory.hasItem(itemId)) return;

  const now = Date.now();
  if ((lastUse.get(player) ?? 0) + USE_COOLDOWN_MS > now) return;
  lastUse.set(player, now);

  switch (itemId) {
    case CONSUMABLE_ID.EXPERIENCE_POTION:
      if (player.removeItemInven(itemId, 1) <= 0) return;
      player.sendTextBubble("`5GULP! You got smarter!``", true);
      player.addXp(EXPERIENCE_POTION_XP);
      world.sendItemEffect(itemId, player, player);
      return;
    case CONSUMABLE_ID.FIREWORKS:
    case CONSUMABLE_ID.FIREWORKS_ALT:
      if (player.removeItemInven(itemId, 1) <= 0) return;
      world.sendParticleEffect(FIREWORKS_EFFECT, player.state.x + 16, player.state.y);
      world.playPositioned("audio/fireworks.wav", player.netID);
      return;
    case CONSUMABLE_ID.MEGAPHONE:
      openMegaphone(player);
      return;
    case CONSUMABLE_ID.DOOR_MOVER:
      moveDoor(player, world, tileX, tileY);
      return;
    case CONSUMABLE_ID.LOCK_MOVER:
      moveLock(player, world, tileX, tileY);
      return;
    case CONSUMABLE_ID.BIRTH_CERTIFICATE:
      openGrowIdChange(player);
      return;
    case CONSUMABLE_ID.CHANGE_OF_ADDRESS:
      openWorldSwap(player);
      return;
    case CONSUMABLE_ID.WATER_BUCKET:
      await useWaterBucket(player, world, tileX, tileY);
      return;
  }

  const treeSpray = TREE_SPRAY_SECONDS[itemId];
  if (treeSpray !== undefined) {
    useTreeSpray(player, world, itemId, treeSpray, tileX, tileY);
    return;
  }

  const worldSpray = WORLD_SPRAY_SECONDS[itemId];
  if (worldSpray !== undefined) {
    useWorldSpray(player, world, itemId, worldSpray);
    return;
  }

  const providerSpray = PROVIDER_SPRAY_SECONDS[itemId];
  if (providerSpray !== undefined) {
    useProviderSpray(player, world, itemId, providerSpray, tileX, tileY);
    return;
  }

  const effect = CONSUMABLES[itemId];
  if (!effect) {
    player.sendTextBubble("`4That item isn't supported on this server yet.``", true);
    return;
  }

  const target = playerAt(world, tileX, tileY);

  // thrown items splat wherever they land; the rest must hit a person
  if (!target && effect.action !== "throw") {
    player.sendTextBubble("Must be used on a person.", true);
    return;
  }
  if (player.removeItemInven(itemId, 1) <= 0) return;

  if (!target) {
    if (effect.effectId) world.sendParticleEffect(effect.effectId, tileX * 32 + 16, tileY * 32 + 16);
    world.playPositioned("audio/splat.wav", player.netID);
    return;
  }

  world.sendItemEffect(itemId, player, target);
  if (effect.bubble) bubbleToWorld(world, target, effect.bubble);
  if (effect.action === "consume") world.playPositioned("audio/eat.wav", target.netID);
  if (effect.effectId) world.sendParticleEffect(effect.effectId, target.state.x + 16, target.state.y + 16);
  if (effect.mod) target.playMods.add(effect.mod);
  if (effect.mod && target !== player) {
    const name = getItem(itemId)?.name ?? "something";
    for (const other of world.players) other.variants.sendOnConsoleMessage(`\`7[\`\`${player.displayName} used \`2${name}\`\` on ${target.displayName}.\`7]\`\``);
  }
}

// --- grow spray --------------------------------------------------------------

/** "1 hour" / "24 hours" / "30 days", as shown in the overlay text. */
function describeAge(seconds: number): string {
  if (seconds >= 86_400) {
    const days = Math.round(seconds / 86_400);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const hours = Math.round(seconds / 3_600);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/** Ages the growing tree on the used tile by one spray. */
function useTreeSpray(player: Player, world: World, itemId: number, seconds: number, tileX: number, tileY: number): void {
  const block = world.getTileAt(tileX, tileY);
  const tree = block?.tree;
  if (!block || !tree) {
    player.sendTextBubble("Use this on a growing tree to speed its growth.", true);
    return;
  }

  const now = Date.now();
  if (tree.fullyGrownAt <= now) {
    player.sendTextBubble("This tree has already bloomed, don't waste your spray on it!", true);
    return;
  }

  const ms = seconds * 1000;
  tree.plantedAt -= ms;
  tree.fullyGrownAt -= ms;
  // the tile stores the seed, so the grown block is the id before it
  const name = getItem(block.fg - 1)?.name ?? getItem(block.fg)?.name ?? "Tree";
  player.variants.sendOnTextOverlay(tree.fullyGrownAt <= now ? `${name} Tree grew to full size!` : `${name} Tree aged \`$${describeAge(seconds)}\``);
  player.variants.sendOnPlayPositioned("audio/spray.wav", player.netID);
  tileFrom(world, block).tileUpdate();
  player.removeItemInven(itemId, 1);
  world.markDirty();
}

/** Ages every growing tree in the world by one world spray. */
function useWorldSpray(player: Player, world: World, itemId: number, seconds: number): void {
  const now = Date.now();
  const ms = seconds * 1000;
  let aged = 0;
  for (const block of world.data.blocks) {
    if (!block.tree || block.tree.fullyGrownAt <= now) continue;
    block.tree.plantedAt -= ms;
    block.tree.fullyGrownAt -= ms;
    tileFrom(world, block).tileUpdate();
    aged++;
  }

  if (aged === 0) {
    player.sendTextBubble("There are no growing trees in this world to spray!", true);
    return;
  }

  player.variants.sendOnTextOverlay(`All trees in the world aged \`$${describeAge(seconds)}\``);
  player.variants.sendOnPlayPositioned("audio/spray.wav", player.netID);
  player.removeItemInven(itemId, 1);
  world.markDirty();
}

/** Ages a provider block on the used tile by one provider spray. */
function useProviderSpray(player: Player, world: World, itemId: number, seconds: number, tileX: number, tileY: number): void {
  const block = world.getTileAt(tileX, tileY);
  if (!block || !block.provider) {
    player.sendTextBubble("Use this on a provider to speed it up.", true);
    return;
  }

  const itemMeta = getItem(block.fg);
  const growTime = itemMeta?.growTime ?? 86400;
  const now = Date.now();
  const elapsed = Math.floor((now - block.provider.plantedAt) / 1000);

  if (elapsed >= growTime) {
    player.sendTextBubble("This provider is already ready, don't waste your spray on it!", true);
    return;
  }

  block.provider.plantedAt -= seconds * 1000;
  const newElapsed = Math.floor((now - block.provider.plantedAt) / 1000);
  const name = itemMeta?.name ?? "Provider";
  player.variants.sendOnTextOverlay(newElapsed >= growTime ? `${name} Provider is ready!` : `${name} Provider aged \`$${describeAge(seconds)}\``);
  player.variants.sendOnPlayPositioned("audio/spray.wav", player.netID);
  tileFrom(world, block).tileUpdate();
  player.removeItemInven(itemId, 1);
  world.markDirty();
}

// --- door mover --------------------------------------------------------------

/** Whether a tile is free for the main door (empty, or already door/bedrock). */
function doorSpotFree(tile: TileData | undefined): boolean {
  return tile !== undefined && (tile.fg === 0 || tile.fg === ITEM_ID.MAIN_DOOR || tile.fg === ITEM_ID.BEDROCK) && tile.bg === 0;
}

function moveDoor(player: Player, world: World, tileX: number, tileY: number): void {
  if (!ownsWorld(player, world)) {
    player.sendTextBubble("You can only use this in a world that you have world-locked!", false);
    return;
  }

  const top = world.getTileAt(tileX, tileY);
  const bottom = world.getTileAt(tileX, tileY + 1);
  if (tileY <= 0 || !doorSpotFree(top) || !doorSpotFree(bottom)) {
    player.sendSfx("audio/cant_place_tile.wav");
    player.sendTextBubble("There's no room to put the door there! You need 2 empty spaces vertically.", true);
    return;
  }
  if (player.removeItemInven(CONSUMABLE_ID.DOOR_MOVER, 1) <= 0) return;

  const changed: TileData[] = [];
  const oldDoor = world.mainDoor;
  const doorData = oldDoor?.door ?? { label: "EXIT", destination: "EXIT" };
  if (oldDoor) {
    oldDoor.fg = 0;
    delete oldDoor.door;
    oldDoor.flags &= ~(TileFlags.TILEEXTRA | TileFlags.PUBLIC);
    changed.push(oldDoor);
    const oldBase = world.getTileAt(oldDoor.x, oldDoor.y + 1);
    if (oldBase?.fg === ITEM_ID.BEDROCK) {
      oldBase.fg = 0;
      changed.push(oldBase);
    }
  }

  // the main door keeps its exit data and stays public, or nobody can leave
  top!.fg = ITEM_ID.MAIN_DOOR;
  top!.door = doorData;
  top!.flags |= TileFlags.TILEEXTRA | TileFlags.PUBLIC;
  bottom!.fg = ITEM_ID.BEDROCK;
  changed.push(top!, bottom!);
  for (const tile of changed) tileFrom(world, tile).tileUpdate();

  for (const other of world.players) other.setPosition(tileX * 32, tileY * 32);
  player.sendTextBubble("You've moved the door!", true);
  world.markDirty();
}

// --- lock mover --------------------------------------------------------------

function moveLock(player: Player, world: World, tileX: number, tileY: number): void {
  if (!ownsWorld(player, world)) {
    player.sendTextBubble("You can only use this in a world that you have world-locked!", true);
    return;
  }

  const target = world.getTileAt(tileX, tileY);
  const source = world.data.blocks.find((tile) => tile.worldLockData !== undefined);
  if (!target || target.fg !== 0 || !source || target === source) {
    player.sendSfx("audio/cant_place_tile.wav");
    player.sendTextBubble("There's no room to put the lock there! You need 1 empty space vertically.", true);
    return;
  }
  if (player.removeItemInven(CONSUMABLE_ID.LOCK_MOVER, 1) <= 0) return;

  target.fg = source.fg;
  if (source.lock) target.lock = source.lock;
  if (source.worldLockData) target.worldLockData = source.worldLockData;
  target.flags = (target.flags & (TileFlags.LOCKED | TileFlags.WATER)) | TileFlags.TILEEXTRA | (source.flags & TileFlags.PUBLIC);

  source.fg = 0;
  delete source.lock;
  delete source.worldLockData;
  source.flags &= TileFlags.LOCKED | TileFlags.WATER;

  world.data.worldLockIndex = target.x + target.y * world.width;
  tileFrom(world, source).tileUpdate();
  tileFrom(world, target).tileUpdate();
  player.sendTextBubble("You've moved the world lock!", true);
  world.markDirty();
}

// --- megaphone ---------------------------------------------------------------

function openMegaphone(player: Player): void {
  if (player.playMods.has("megaphone")) {
    player.sendTextBubble("You can't broadcast again so soon!", true);
    return;
  }
  const dialog = new DialogBuilder()
    .defaultColor("`o")
    .addLabelWithIcon("`wMegaphone``", CONSUMABLE_ID.MEGAPHONE, "big")
    .addTextBox("Enter a message you want to broadcast to every player in Growtopia! This will use up 1 Megaphone.")
    .addInputBox("words", "", "", 128)
    .endDialog("megaphone", "Nevermind", "Broadcast")
    .str();
  player.variants.sendOnDialogRequest(dialog);
}

registerDialog("megaphone", (player, action) => {
  const message = action.get("words").replace(/`./g, "").trim();
  if (!message || player.playMods.has("megaphone")) return;
  if (player.removeItemInven(CONSUMABLE_ID.MEGAPHONE, 1) <= 0) return;

  player.playMods.add("megaphone");
  const location = player.currentWorld || "the menu";
  serverManager.broadcast(Variant.from("OnConsoleMessage", `CP:0_PL:4_OID:_CT:[SB]_ \`5**\`\` from \`$\`2${player.displayName} \`\`\`\`(in \`$${location}\`\`) ** :\`\` \`#${message}`).parsePacket());
  for (const other of serverManager.players.values()) other.sendSfx("audio/beep.wav");
});

// --- birth certificate (GrowID change) ---------------------------------------

function openGrowIdChange(player: Player): void {
  const dialog = new DialogBuilder()
    .defaultColor("`o")
    .addLabelWithIcon("`wChange your GrowID``", CONSUMABLE_ID.BIRTH_CERTIFICATE, "big")
    .addTextBox("A little white-out, a little scribbling, and voila, you'll have a new name! Your `wBirth Certificate`` will be consumed and you will need to log in again with the new GrowID.")
    .addInputBox("new_name", "New GrowID:", "", 18)
    .endDialog("growid_change", "Cancel", "Change It!")
    .str();
  player.variants.sendOnDialogRequest(dialog);
}

registerDialog("growid_change", async (player, action) => {
  const newName = action.get("new_name").trim();
  if (!player.inventory.hasItem(CONSUMABLE_ID.BIRTH_CERTIFICATE)) return;

  if (!GROWID_PATTERN.test(newName)) {
    player.sendTextBubble("`4A GrowID must be 3 to 18 letters or numbers.``", true);
    return;
  }
  if (newName.toLowerCase() === player.tankIDName.toLowerCase()) {
    player.sendTextBubble("That's already your name!", true);
    return;
  }
  if ((await PlayerDB.exists(newName)) || (await PlayerDB.getByDisplayName(newName))) {
    player.sendTextBubble("`4That GrowID is already taken.``", true);
    return;
  }
  if (player.removeItemInven(CONSUMABLE_ID.BIRTH_CERTIFICATE, 1) <= 0) return;

  try {
    await player.saveToDatabase();
    await PlayerDB.updateById(player.playerId, { name: newName, display_name: newName });
    await AccountDB.updateAccountId(player.playerId, newName);
  } catch (err) {
    logger.error({ err, playerId: player.playerId }, "failed to change growid");
    player.addItemInven(CONSUMABLE_ID.BIRTH_CERTIFICATE, 1);
    player.sendTextBubble("`4Something went wrong, your name was not changed.``", true);
    return;
  }

  logger.info({ playerId: player.playerId, from: player.tankIDName, to: newName }, "player changed growid");
  player.tankIDName = newName;
  player.displayName = newName;
  player.variants.sendSetHasGrowID(true, newName, player.auth.metadata.tankIDPass || player.auth.transferSession?.sessionToken || "");
  player.variants.sendOnConsoleMessage(`\`2Your GrowID is now \`w${newName}\`2. Please log in again.\`\``);
  player.leaveWorld(false);
  player.disconnectLater();
});

// --- change of address (world name swap) -------------------------------------

function openWorldSwap(player: Player): void {
  const dialog = new DialogBuilder()
    .defaultColor("`o")
    .addLabelWithIcon("`wSwap World Names``", CONSUMABLE_ID.CHANGE_OF_ADDRESS, "big")
    .addSmallText("This will swap the name of the world you are standing in with another world `4permanently``.  You must own both worlds, with a World Lock in place.<CR>Your `wChange of Address`` will be consumed if you press `5Swap 'Em``.")
    .addTextBox("Enter the other world's name:")
    .addInputBox("name_box", "", "", 32)
    .addSpacer("small")
    .endDialog("world_swap", "Cancel", "Swap 'Em!")
    .str();
  player.variants.sendOnDialogRequest(dialog);
}

registerDialog("world_swap", async (player, action) => {
  const world = player.world;
  if (!world || !player.inventory.hasItem(CONSUMABLE_ID.CHANGE_OF_ADDRESS)) return;

  const otherName = action.get("name_box").trim().toUpperCase();
  if (!/^[A-Z0-9]{1,24}$/.test(otherName) || otherName === world.name) {
    player.sendTextBubble("`4That's not a valid world name.``", true);
    return;
  }
  if (!ownsWorld(player, world)) {
    player.sendTextBubble("You must own this world, with a World Lock in place.", true);
    return;
  }
  if (!(await WorldDB.exists(otherName))) {
    player.sendTextBubble("`4There is no world with that name.``", true);
    return;
  }

  const other = await worldManager.get(otherName);
  if (!ownsWorld(player, other)) {
    player.sendTextBubble("You must own both worlds, with a World Lock in place.", true);
    return;
  }
  if (player.removeItemInven(CONSUMABLE_ID.CHANGE_OF_ADDRESS, 1) <= 0) return;

  const thisName = world.name;
  const temp = `${thisName}SWAP${Date.now().toString(36).toUpperCase()}`;
  try {
    await worldManager.rename(world, temp);
    await worldManager.rename(other, thisName);
    await worldManager.rename(world, otherName);
  } catch (err) {
    logger.error({ err, world: thisName, other: otherName }, "world name swap failed");
    player.sendTextBubble("`4Something went wrong while swapping the names.``", true);
    return;
  }

  const notice = `\`5[\`\`\`w${thisName}\`\` and \`w${otherName}\`\` swapped names!\`5]\`\``;
  for (const target of [world, other]) {
    for (const member of target.players) member.variants.sendOnConsoleMessage(notice);
  }
  player.sendTextBubble("You've swapped the world names! Re-enter the worlds to see the change.", true);
});
