import { CHARACTER_STATE } from "../../constants";
import { Collection } from "../../utils/collection";
import {
  XENO_B_DOUBLE_JUMP,
  XENO_B_HIGH_JUMP,
  XENO_B_LONG_BUILD,
  XENO_B_LONG_PUNCH,
  XENO_B_SPEED,
  XENO_B_STRONG_PUNCH,
  XENO_F_DOUBLE_JUMP,
  XENO_F_HIGH_JUMP,
  XENO_F_LONG_BUILD,
  XENO_F_LONG_PUNCH,
  XENO_F_SPEED,
  XENO_F_STRONG_PUNCH,
} from "../world/constants";
import type { XenoniteSettings } from "../world/types";

/**
 * A play mod: a temporary or wearable modifier of the avatar. Wearable mods
 * are granted by the items in `items` while they are worn; timed mods are
 * granted by consumables for `duration` seconds (0 = until removed).
 * Modelled after the official play mod list (names and messages match the
 * real game).
 */
export interface PlayModDef {
  id: string;
  name: string;
  /** Item drawn next to the name in the profile. */
  displayItem: number;
  addMessage: string;
  removeMessage: string;
  /** Seconds the mod lasts; 0 lasts until it is removed. */
  duration: number;
  /** Items that grant the mod while worn. */
  items: number[];
  charState: number;
  /** Multiplied into the skin color, as `[r, g, b, a]` 0..255. */
  skinColor?: [number, number, number, number];
  /** Added to the base movement speed. */
  speed?: number;
  /** Replaces the base gravity. */
  gravity?: number;
  /** Added to the base punch knockback. */
  punchPower?: number;
  /** Added to the base block damage per punch. */
  punchDamage?: number;
  /** Punch effect id. */
  punchType?: number;
  buildRange?: number;
  punchRange?: number;
  /** Sound played to the player when the mod is added. */
  sound?: string;
}

type ModInput = Omit<PlayModDef, "duration" | "items" | "charState"> & Partial<Pick<PlayModDef, "duration" | "items" | "charState">>;

function mod(input: ModInput): PlayModDef {
  return { duration: 0, items: [], charState: 0, ...input };
}

/** Every play mod the server knows, keyed by id. */
export const PLAY_MODS: Collection<string, PlayModDef> = new Collection();

for (const def of [
  // --- wearable ------------------------------------------------------------
  mod({ id: "ninja_stealth", name: "Ninja Stealth", displayItem: 290, addMessage: "Silent, invisible, deadly.", removeMessage: "You are less sneaky now.", skinColor: [100, 100, 100, 150], items: [290] }),
  mod({
    id: "double_jump",
    name: "Double Jump",
    displayItem: 156,
    addMessage: "You can jump in mid-air!  It's like flying, but less.",
    removeMessage: "Gravity - it's the law.",
    charState: CHARACTER_STATE.DOUBLE_JUMP,
    items: [156, 350, 362, 678, 736, 1166, 3112, 1206, 1460, 1550, 1574, 1672, 1674, 1738, 1784, 1824, 1934, 1936, 1938, 2254, 2256, 2258, 2260, 2262, 2264, 6162, 4184, 3104, 3114, 3120, 3134, 3144, 3576, 3604, 3762, 3514, 4820, 4412, 4428, 4440, 4442, 4534],
  }),
  mod({ id: "the_one_ring", name: "The One Ring", displayItem: 1904, addMessage: "No one will take your precious!", removeMessage: "I guess someone took your precious.", charState: CHARACTER_STATE.IS_INVISIBLE, items: [1904] }),
  mod({ id: "legendary", name: "Legendary!", displayItem: 1782, addMessage: "You should be very very nice to your pet.", removeMessage: "You feel lonely.", punchPower: 300, punchDamage: 4, punchType: 21, items: [1782] }),
  mod({ id: "speedy", name: "Speedy", displayItem: 496, addMessage: "You can move faster!", removeMessage: "You are slow again.", speed: 60, items: [496, 1822, 1940] }),
  mod({ id: "carrying_a_torch", name: "Carrying a Torch", displayItem: 3578, addMessage: "I'm attacking the darkness!", removeMessage: "My torch went out.", items: [3578] }),
  mod({ id: "energized_horn", name: "Energized Horn", displayItem: 4746, addMessage: "You shoot lightning from your horn(s)!", removeMessage: "Tired of tooting your own horn?", punchType: 75, buildRange: 1, items: [4746, 4748, 4750] }),
  mod({ id: "fire_hose", name: "Fire Hose", displayItem: 3066, addMessage: "Where does the water come from?", removeMessage: "Guess you finally ran out of water.", punchType: 57, punchRange: 1, punchPower: 300, items: [3066] }),
  mod({ id: "focused_eyes", name: "Focused Eyes", displayItem: 1204, addMessage: "Give people the evil eye.", removeMessage: "Your vision is normal.", punchType: 10, items: [1204] }),
  mod({ id: "putt_putt_putt", name: "Putt Putt Putt", displayItem: 898, addMessage: "Tractors are not speedy.", removeMessage: "You can walk faster than that thing!", speed: -100, items: [898, 1830, 1966] }),
  mod({ id: "hunting_ghosts", name: "Hunting Ghosts", displayItem: 3716, addMessage: "You fire Neutron Beams (requires Neutron Pack to work).", removeMessage: "You're afraid of a ghost.", punchType: 69, punchRange: 2, items: [3716] }),
  mod({ id: "geiger_counter", name: "Geiger Counter", displayItem: 2204, addMessage: "You are detecting radiation...", removeMessage: "Geiger Counter removed.", items: [2204] }),

  // --- world-driven ------------------------------------------------------------
  // granted while a Xenonite Crystal is placed in the world; its masks, not the
  // mod itself, carry the force/block state (see applyXenonite)
  mod({ id: "xenonite", name: "Xenonite", displayItem: 2072, addMessage: "", removeMessage: "" }),

  // --- timed (consumables) -------------------------------------------------
  mod({ id: "feelin_blue", name: "Feelin' Blue", displayItem: 196, addMessage: "A `!blueberry`` slides down your throat!", removeMessage: "The effects of the `!blueberry`` have worn off.", skinColor: [0, 0, 255, 255], duration: 3600, sound: "audio/spray.wav" }),
  mod({ id: "stinky", name: "Stinky", displayItem: 372, addMessage: "You really really smell.", removeMessage: "The air clears.", charState: CHARACTER_STATE.HAVE_CIGAR, duration: 300, sound: "audio/spray.wav" }),
  mod({ id: "frozen", name: "Frozen", displayItem: 1368, addMessage: "Your body has turned to ice. You can't move!", removeMessage: "You've thawed out.", charState: CHARACTER_STATE.IS_FROZEN, skinColor: [100, 200, 255, 255], duration: 2, sound: "audio/freeze.wav" }),
  mod({ id: "egged", name: "Egged!", displayItem: 874, addMessage: "You have egg on your face.", removeMessage: "You washed your face!", charState: CHARACTER_STATE.IS_EGGED, skinColor: [255, 221, 0, 255], duration: 180 }),
  mod({ id: "muddy", name: "Muddy", displayItem: 368, addMessage: "You've been splattered with mud!", removeMessage: "Clean again!", skinColor: [101, 67, 33, 255], speed: -200, gravity: 900, duration: 3, sound: "audio/splat.wav" }),
  mod({ id: "irradiated", name: "Irradiated", displayItem: 2206, addMessage: "You are aglow with radiation!", removeMessage: "You have recovered.", charState: CHARACTER_STATE.HAVE_GEIGER_RADIATION, duration: 1800 }),
  mod({ id: "duct_tape", name: "Duct Tape", displayItem: 408, addMessage: "Duct tape has covered your mouth!", removeMessage: "Duct tape removed. OUCH!", charState: CHARACTER_STATE.IS_DUCTAPED, duration: 600, sound: "audio/already_used.wav" }),
  mod({ id: "valentine", name: "Valentine", displayItem: 384, addMessage: "You are somebody's valentine!", removeMessage: "Yuck!", skinColor: [255, 150, 200, 255], duration: 3600, sound: "audio/choir.wav" }),
  mod({ id: "lucky", name: "Lucky", displayItem: 528, addMessage: "You're luckier than before!", removeMessage: "Your luck has worn off.", charState: CHARACTER_STATE.IS_SHINING, duration: 1800 }),
  mod({ id: "envious", name: "Envious", displayItem: 540, addMessage: "It ain't easy being you.", removeMessage: "Healthy color restored.", skinColor: [96, 255, 96, 255], duration: 900, sound: "audio/eat.wav" }),
  mod({ id: "floating", name: "Floating!", displayItem: 338, addMessage: "Whoooooooaaaaaaaa...", removeMessage: "Gravity - it's the law.", gravity: -30, duration: 2, sound: "audio/balloon.wav" }),
  mod({ id: "saucy", name: "Saucy!", displayItem: 962, addMessage: "You are a saucy person.", removeMessage: "You got cleaned up.", skinColor: [255, 40, 40, 255], duration: 180 }),
  mod({ id: "antidote", name: "Antidote!", displayItem: 782, addMessage: "You are now immune to zombie bites! Temporarily...", removeMessage: "Your immunity is gone.", duration: 3600 }),
  mod({ id: "golden_halo", name: "Golden Halo!", displayItem: 128, addMessage: "You have been good.", removeMessage: "You're falling out of favor.", charState: CHARACTER_STATE.GOLDEN_HALO, duration: 1800 }),
  mod({ id: "infected", name: "Infected!", displayItem: 764, addMessage: "You've been infected by the g-Virus. Punch others to infect them, too! Braiiiins...", removeMessage: "You've been cured.", charState: CHARACTER_STATE.IS_ZOMBIE, duration: 60 }),
  mod({ id: "devil_horns", name: "Devil Horns", displayItem: 126, addMessage: "You little devil...", removeMessage: "Off the naughty list!", charState: CHARACTER_STATE.DEVIL_HORNS, duration: 1800, sound: "audio/spray.wav" }),
  mod({ id: "on_fire", name: "ON FIRE!!!", displayItem: 960, addMessage: "You are burning up!", removeMessage: "The fire's out.", charState: CHARACTER_STATE.IS_HIT_BY_LAVA, duration: 5 }),
  mod({ id: "haunted", name: "Haunted!", displayItem: 1988, addMessage: "You are haunted!", removeMessage: "Not anymore.", charState: CHARACTER_STATE.HAVE_HAUNTED_SHADOWS, duration: 1800, sound: "audio/spray.wav" }),
  mod({ id: "caffeinated", name: "Caffeinated", displayItem: 1634, addMessage: "You are full of caffeine!", removeMessage: "Ugh. Caffeine crash.", speed: 100, duration: 5, sound: "audio/spray.wav" }),
  mod({ id: "blushing_red", name: "Blushing Red", displayItem: 4766, addMessage: "`4Cherry`` red lips!", removeMessage: "The effects of the `!Cherry`` have worn off.", skinColor: [255, 120, 120, 255], duration: 1800, sound: "audio/spray.wav" }),
  mod({ id: "megaphone", name: "Megaphone!", displayItem: 2480, addMessage: "Broadcasting to ALL!", removeMessage: "You can broadcast once again.", duration: 600 }),
  mod({ id: "extra_xp", name: "Food: Extra XP", displayItem: 1474, addMessage: "25% chance of double XP for all actions.", removeMessage: "Your stomach's rumbling.", duration: 1800, sound: "audio/spray.wav" }),
  mod({ id: "composer", name: "Food: Composer", displayItem: 6906, addMessage: "You can see musical notes in the world!", removeMessage: "The music fades from your eyes.", duration: 1800, sound: "audio/eat.wav" }),
]) {
  PLAY_MODS.set(def.id, def);
}

/** Play mods granted by wearing an item, keyed by item id. */
export const WEARABLE_MODS: Collection<number, PlayModDef> = new Collection();
for (const def of PLAY_MODS.values()) {
  for (const itemId of def.items) WEARABLE_MODS.set(itemId, def);
}

/** A mod currently applied to a player. */
export interface ActivePlayMod {
  id: string;
  /** Unix ms when the mod ends, 0 for wearable mods. */
  expiresAt: number;
}

/** The avatar modifiers sent with SET_CHARACTER_STATE. */
export interface CharacterStats {
  charState: number;
  punchType: number;
  buildRange: number;
  punchRange: number;
  speed: number;
  accel: number;
  gravity: number;
  punchPower: number;
  punchDamage: number;
  waterSpeed: number;
  /** `[r, g, b, a]` multiplier applied to the skin color, or undefined. */
  skinTint?: [number, number, number, number];
}

/** Defaults the client plays with when no mod is active. */
export const BASE_STATS: Readonly<CharacterStats> = {
  charState: 0,
  punchType: 0,
  buildRange: 128,
  punchRange: 128,
  speed: 1200,
  accel: 250,
  gravity: 1000,
  punchPower: 200,
  punchDamage: 6,
  waterSpeed: 125,
};

/** Formats seconds as the game does: `1h 2m 3s`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (rest || parts.length === 0) parts.push(`${rest}s`);
  return parts.join(" ");
}

/**
 * Combines the active mods into the stats to send. Mods add to the base
 * values; the last mod that sets a punch type or gravity wins.
 */
export function computeStats(active: Iterable<ActivePlayMod>): CharacterStats {
  const stats: CharacterStats = { ...BASE_STATS };
  const tints: [number, number, number, number][] = [];

  for (const entry of active) {
    const def = PLAY_MODS.get(entry.id);
    if (!def) continue;

    stats.charState |= def.charState;
    if (def.punchType) stats.punchType = def.punchType;
    if (def.gravity !== undefined) stats.gravity = def.gravity;
    stats.speed += def.speed ?? 0;
    stats.punchPower += def.punchPower ?? 0;
    stats.punchDamage += def.punchDamage ?? 0;
    stats.buildRange += def.buildRange ?? 0;
    stats.punchRange += def.punchRange ?? 0;

    if (def.skinColor) tints.push(def.skinColor);
  }

  const tint = mixTints(tints);
  if (tint) stats.skinTint = tint;
  return stats;
}

/**
 * Averages the colors of the active effect mods, weighted by their alpha, so
 * stacked effects (egg + tomato, ...) mix instead of multiplying into black.
 * The strongest alpha is kept as the coverage over the base skin color.
 */
export function mixTints(tints: readonly (readonly [number, number, number, number])[]): [number, number, number, number] | undefined {
  let red = 0, green = 0, blue = 0, weight = 0, alpha = 0;

  for (const [r, g, b, a] of tints) {
    const coverage = a / 255;
    if (coverage <= 0) continue;
    red += r * coverage;
    green += g * coverage;
    blue += b * coverage;
    weight += coverage;
    alpha = Math.max(alpha, a);
  }

  if (weight === 0) return undefined;
  return [Math.round(red / weight), Math.round(green / weight), Math.round(blue / weight), alpha];
}

/** Composites the tint over a packed `0xRRGGBBAA` skin color. */
/**
 * Applies a Xenonite Crystal's force/block masks to the stats, with the same
 * clamp values as the official server. Heat resist (fire damage) and the
 * powerup block are enforced by the client from the crystal's extra data.
 */
export function applyXenonite(stats: CharacterStats, settings: XenoniteSettings): CharacterStats {
  const { flags, flags2 } = settings;
  if (!flags && !flags2) return stats;

  const restricted: CharacterStats = { ...stats };
  const force = (bit: number) => (flags & bit) !== 0;
  const block = (bit: number) => (flags & bit) !== 0;
  const force2 = (bit: number) => (flags2 & bit) !== 0;
  const block2 = (bit: number) => (flags2 & bit) !== 0;

  if (force(XENO_F_DOUBLE_JUMP)) restricted.charState |= CHARACTER_STATE.DOUBLE_JUMP;
  else if (block(XENO_B_DOUBLE_JUMP)) restricted.charState &= ~CHARACTER_STATE.DOUBLE_JUMP;

  if (force(XENO_F_HIGH_JUMP)) {
    if (700 < restricted.gravity) restricted.gravity = 700;
  } else if (block(XENO_B_HIGH_JUMP)) {
    if (restricted.gravity < BASE_STATS.gravity) restricted.gravity = BASE_STATS.gravity;
  }

  if (force(XENO_F_STRONG_PUNCH)) {
    if (restricted.punchPower < 500) restricted.punchPower = 500;
  } else if (block(XENO_B_STRONG_PUNCH)) {
    if (BASE_STATS.punchPower < restricted.punchPower) restricted.punchPower = BASE_STATS.punchPower;
  }

  if (force(XENO_F_SPEED)) {
    if (restricted.accel < 310) restricted.accel = 310;
  } else if (block(XENO_B_SPEED)) {
    if (BASE_STATS.accel < restricted.accel) restricted.accel = BASE_STATS.accel;
  }

  if (force2(XENO_F_LONG_PUNCH)) {
    if (restricted.punchRange < 128) restricted.punchRange = 130;
  } else if (block2(XENO_B_LONG_PUNCH)) {
    if (128 < restricted.punchRange) restricted.punchRange = 128;
  }

  if (force2(XENO_F_LONG_BUILD)) {
    if (restricted.buildRange < 128) restricted.buildRange = 129;
  } else if (block2(XENO_B_LONG_BUILD)) {
    if (128 < restricted.buildRange) restricted.buildRange = 128;
  }

  return restricted;
}

export function tintSkinColor(color: number, tint: [number, number, number, number] | undefined): number {
  if (!tint) return color >>> 0;
  const [red, green, blue, alpha] = tint;
  const coverage = alpha / 255;
  const channel = (shift: number, value: number) => {
    const base = (color >>> shift) & 0xff;
    return Math.round(base * (1 - coverage) + value * coverage) & 0xff;
  };
  return ((channel(24, red) << 24) | (channel(16, green) << 16) | (channel(8, blue) << 8) | 0xff) >>> 0;
}
