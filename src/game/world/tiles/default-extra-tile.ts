import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { Tile } from "../tile";
import { ActionTypes, TileFlags } from "../constants";

/**
 * Fallback for item types the server has no handler for, but whose tiles the
 * client requires "tile extra" data for. Without that data the client crashes
 * while loading the world. This sends a valid, empty payload so the item
 * renders normally but does nothing.
 *
 * Each array is the full extra data: the extra-type byte, then the default
 * payload (little-endian; a "str" is u16 length + bytes, so empty = 0, 0).
 * Layouts were taken from real world dumps (world version 25) parsed against
 * items-v5.61.dat ("live"), cross-checked with recent open-source parsers and
 * servers (GTOS, badewen/Growtopia-Things, gtworld-r, GTProxy). Types whose
 * sources disagree are left in UNSUPPORTED_EXTRA_TYPES instead.
 */

const z = (n: number): number[] => Array<number>(n).fill(0);
const FF32 = [0xff, 0xff, 0xff, 0xff];
const u32 = (v: number): number[] => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
const EMPTY_STR = [0, 0];
// Sign layout (str label + u32): what live servers send for mailboxes & co.
const SIGN_LIKE = [2, ...EMPTY_STR, ...FF32];

const DEFAULT_EXTRA_BY_ACTION: Partial<Record<number, number[]>> = {
  [ActionTypes.MAILBOX]: SIGN_LIKE,
  [ActionTypes.BULLETIN]: SIGN_LIKE,
  [ActionTypes.DONATION_BOX]: SIGN_LIKE,
  [ActionTypes.SECURITY_CAMERA]: SIGN_LIKE,
  [ActionTypes.PROVIDER]: [9, ...z(4)], // u32 age
  [ActionTypes.ACHIEVEMENT]: [10, ...FF32, 0x7f], // u32 owner, u8 achievement
  [ActionTypes.MANNEQUIN]: [14, ...EMPTY_STR, 0, ...FF32, ...z(18)], // str, u8, u32 hair color, 9x u16 clothes
  [ActionTypes.MAGIC_EGG]: [15, ...z(4)],
  [ActionTypes.XENONITE]: [18, ...z(5)], // u8 + u32
  [ActionTypes.DRESSUP]: [19, ...z(18)], // 9x u16
  [ActionTypes.CRYSTAL]: [20, ...EMPTY_STR],
  [ActionTypes.BURGLAR]: [21, ...EMPTY_STR, ...z(5)], // str, u32, u8
  [ActionTypes.SPOTLIGHT]: [22],
  [ActionTypes.FISHTANK]: [25, ...z(5)], // u8 flags, u32 fish count
  [ActionTypes.SOLAR]: [26, ...z(5)],
  [ActionTypes.FORGE]: [27, ...z(4)],
  [ActionTypes.GIVING_TREE]: [28, ...z(6)],
  [ActionTypes.STEAM_ORGAN]: [30, ...z(5)],
  [ActionTypes.TAMAGOTCHI]: [31, 0, ...EMPTY_STR, ...z(12), 0, ...z(16)], // u8, str, 3x u32, u8, 4x u32
  [ActionTypes.FLAG]: [33, ...EMPTY_STR],
  [ActionTypes.LOBSTER_TRAP]: [34],
  [ActionTypes.ART_CANVAS]: [35, ...z(4), ...EMPTY_STR], // u32 item, str
  [ActionTypes.BATTLE_CAGE]: [36, ...EMPTY_STR, ...z(12)],
  [ActionTypes.PET_TRAINER]: [37, ...EMPTY_STR, ...z(8)],
  [ActionTypes.STEAM_ENGINE]: [38, ...z(4)],
  [ActionTypes.LOCKBOT]: [39, ...z(4)],
  [ActionTypes.WEATHER_SPECIAL]: [40, ...z(4)], // u32 item/color
  [ActionTypes.SPIRIT_STORAGE]: [41, ...z(4)],
  [ActionTypes.DISPLAY_SHELF]: [43, ...z(16)], // 4x u32 item
  [ActionTypes.VIP_ENTRANCE]: [44, ...z(9)], // u8, u32 owner, u32 count
  [ActionTypes.CHALLENGE_TIMER]: [45],
  [ActionTypes.FISH_MOUNT]: [47, ...EMPTY_STR, ...z(5)], // str, u32, u8
  [ActionTypes.WEATHER_SPECIAL2]: [49, ...z(4), ...u32(50), 0], // u32 item, u32 gravity (50), u8 flags
  [ActionTypes.FOSSIL_PREP]: [50, ...z(4)],
  [ActionTypes.DNA_MACHINE]: [51],
  [ActionTypes.BLASTER]: [52],
  [ActionTypes.CHEMTANK]: [53, ...z(8)],
  [ActionTypes.STORAGE]: [54, 0, 0], // u16 byte length of records
  [ActionTypes.OVEN]: [55, ...z(20)],
  [ActionTypes.SUPER_MUSIC]: [56, ...EMPTY_STR, ...z(4)],
  [ActionTypes.GEIGER_CHARGER]: [57, ...z(4)],
  [ActionTypes.ADVENTURE_RESET]: [58],
  [ActionTypes.TOMB_ROBBER]: [59],
  [ActionTypes.FACTION]: [60, ...z(5)],
  // Magplant / item sucker: u32 item, u32 amount, u8 sucking, u8 planting, u32 capacity (5000)
  [ActionTypes.ITEM_SUCKER]: [62, ...z(8), 1, 0, ...u32(5000)],
  [ActionTypes.ROBOT]: [63, ...z(12)],
  [ActionTypes.STATS_BLOCK]: [66, 0], // GrowScan 9000
  [ActionTypes.FIELD_NODE]: [67, ...z(8)],
  [ActionTypes.OUIJA_BOARD]: [68, ...z(12)],
  [ActionTypes.AUTO_ACTION_BREAK]: [69, ...z(16)], // Tesseract Manipulator
  [ActionTypes.LIGHTNING_IF_ON]: [72, ...z(12)], // Storm Cloud
  [ActionTypes.PHASED_BLOCK]: [73, ...z(4)],
  [ActionTypes.PASSWORD_STORAGE]: [74], // Safe Vault
  [ActionTypes.WEATHER_INFINITY]: [77, ...z(8)], // u32, u32 count
  [ActionTypes.KRANKENS_BLOCK]: [80, ...z(8)],
  [ActionTypes.FRIENDS_ENTRANCE]: [81, ...z(8)], // u32 owner, u16, u16 count
  [ActionTypes.FISHGOTCHI_TANK]: [61, ...z(35)], // Training Port (35 bytes: u32 FishLb, u16 Status, u32 FishId, u32 Exp, 8B unk, u32 Level, 4B unk, 5B unk)
};

/** Extra data chosen by item ID rather than action type. */
const DEFAULT_EXTRA_BY_ITEM: Partial<Record<number, number[]>> = {
  5000: [40, ...u32(14)], // Weather Machine - Background: default bg item 14
  3760: [42, 0, ...u32(1), ...u32(1), ...u32(1), ...z(4), ...FF32], // Data Bedrock
};

/**
 * Returns the default extra payload for an item type, if the client needs one.
 */
export function getDefaultExtra(actionType: number, itemId: number): number[] | undefined {
  return DEFAULT_EXTRA_BY_ITEM[itemId] ?? DEFAULT_EXTRA_BY_ACTION[actionType];
}

/**
 * Action types that need tile extra data whose layout isn't known or whose
 * sources disagree. Placing them is refused, because a wrong layout makes the
 * client crash while loading the world.
 */
export const UNSUPPORTED_EXTRA_TYPES: ReadonlySet<number> = new Set([
  ActionTypes.TOYBOX,
  ActionTypes.GAME_RESOURCES,
  ActionTypes.GAME_GENERATOR,
  ActionTypes.SWING, // Sewing Machine: u16 vs u32 count
  ActionTypes.CHALLENGE_FLAG,
  ActionTypes.PORTRAIT, // 22 vs 26 vs 32 bytes
  ActionTypes.ITEM_PLANTER,
  ActionTypes.AUTO_ACTION_HARVEST, // Heart of Gaia: unknown
  ActionTypes.AUTO_ACTION_HARVEST_SUCK, // Techno-Organic Engine: unknown
  ActionTypes.PHASED_BLOCK_2,
  ActionTypes.FEEDING_BLOCK,
]);

export class DefaultExtraTile extends Tile {
  private get extra(): number[] | undefined {
    return getDefaultExtra(this.item?.type ?? -1, this.data.fg);
  }

  // The client may read extra data by item type even without the flag, so
  // always set it when writing a payload.
  public override serializedFlags(flags: number): number {
    return this.extra ? flags | TileFlags.TILEEXTRA : flags;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const extra = this.extra;
    if (!extra) return;
    buffer.writeBytes(extra);
  }
}
