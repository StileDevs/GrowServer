/**
 * World, tile and item constants shared by the world code.
 * Values follow the Growtopia client (items.dat action types, tile flags) and
 * were carried over from the legacy GrowServer implementation.
 */

/** Default procedural world size in tiles. */
export const WORLD_SIZE = {
  WIDTH: 100,
  HEIGHT: 60,
};

/** Row where the dirt layer starts in a generated world. */
export const Y_START_DIRT = 24;
/** Row where lava can start to appear. */
export const Y_LAVA_START = 50;
/** Row where the dirt layer ends and bedrock begins. */
export const Y_END_DIRT = 55;
/** Row of the pond the procedural world generates for fishing. */
export const Y_WATER_LAKE = 24;

/**
 * World serialization version sent in the SEND_MAP_DATA header.
 * 0x19 is the oldest format the modern (5.6x) client parses with the current
 * tile extra layout: a 5 byte debug field after the tile count, 12 bytes before
 * the dropped items, the weather trailer after them and the extra lock fields
 * (minimum level, music tempo) after the access list.
 */
export const WORLD_DATA_VERSION = 0x19;

/** Well known item IDs used by the world code. */
export const ITEM_ID = {
  BLANK: 0,
  DIRT: 2,
  DIRT_SEED: 3,
  LAVA: 4,
  MAIN_DOOR: 6,
  BEDROCK: 8,
  ROCK: 10,
  DOOR: 12,
  CAVE_BACKGROUND: 14,
  FIST: 18,
  SIGN: 20,
  WRENCH: 32,
  GEMS: 112,
  WORLD_LOCK: 242,
  GROWTOKEN: 1486,
  DIAMOND_LOCK: 1796,
  BUILDERS_LOCK: 4994,
  BLUE_GEM_LOCK: 7188,
  RAYMANS_FIST: 5480,
  VIP_ENTRANCE: 3798,
  ROULETTE_WHEEL: 758,
  SLOT_MACHINE: 756,
  ANTIGRAVITY_GENERATOR: 4992,
  WEATHER_HEATWAVE: 3694,
  WEATHER_STUFF: 3832,
  WEATHER_BACKGROUND: 5000,
  MYSTIC_RECORD_PLAYER: 10152,
  ORGAN_PIANO: 11346,
  VINTAGE_JUKEBOX: 11372,
  KARAOKE_MACHINE: 15388,
  WINDUP_MUSICAL_BOX: 10518,
  HARMONIPAN: 11900,
  BLENDER_BOP: 12196,
  DANCING_SNOW_GLOBE: 11512,
  DANCING_ZOMBIE: 12778,
  MUSIC_AMPLIFIER: 12358,
  SUSHI_KNIFE: 3466,
  FISH_CHUNK: 3468,
  CUTTING_BOARD: 3470,
  BUTCHER_KNIFE: 4506,
  FISH_TANK: 3004,
  FISH_TANK_PORT: 3002,
  TRAINING_PORT: 5530,
} as const;

/** Weather id of the default (clear) sky. */
export const WEATHER_CLEAR = 41;

/**
 * Toggleable blocks whose sound is a piece of music (the wiki's music block
 * list). Ambiance blocks — jammers, the antigravity generator, torches — also
 * carry an audio file but must not be streamed as music.
 *
 * Two client families hide in the media files: boombox style blocks (types
 * 12 / 22 / 23) play and amplify themselves, while the animated type 122
 * blocks (record players, pianos, jukeboxes, ...) only play positionally and
 * ignore the Music Amplifier, so the server has to relay those.
 */
export const MUSIC_BLOCKS: ReadonlySet<number> = new Set([
  62, 64, 114, 220, 246, 254, 480, 714, 786, 842, 1048, 1196, 1448, 1596, 1754, 1942, 2282, 3088, 4380, 5106, 5242, 5658, 8524, 10152, 10518, 10912, 11346, 11372, 11900, 12008,
  12196, 12778, 15084, 15388, 11512,
]);

/**
 * Action type of the animated foreground blocks (items.dat calls the first
 * entry of this family "Green Fountain"). The client plays their audio with a
 * radius but never spreads it to the world, so these are the music blocks the
 * server streams instead of relying on native playback.
 */
export const CLIENT_UNAMPLIFIED_MUSIC_TYPE = 122;

/**
 * Xenonite Crystal extra data (tile extra type 18): a u8 `flags` word and a
 * u32 `flags2` word of force/block bits, in the order the client reads them.
 * A set force bit grants the power to everyone; a set block bit takes it away.
 */
export const XENO_F_DOUBLE_JUMP = 1 << 0;
export const XENO_B_DOUBLE_JUMP = 1 << 1;
export const XENO_F_HIGH_JUMP = 1 << 2;
export const XENO_B_HIGH_JUMP = 1 << 3;
export const XENO_F_STRONG_PUNCH = 1 << 4;
export const XENO_B_STRONG_PUNCH = 1 << 5;
export const XENO_F_SPEED = 1 << 6;
export const XENO_B_SPEED = 1 << 7;

export const XENO_F_HEAT_RESIST = 1 << 0;
export const XENO_B_HEAT_RESIST = 1 << 1;
export const XENO_F_LONG_PUNCH = 1 << 2;
export const XENO_B_LONG_PUNCH = 1 << 3;
export const XENO_B_POWERUPS = 1 << 4;
export const XENO_F_LONG_BUILD = 1 << 5;
export const XENO_B_LONG_BUILD = 1 << 6;

/** Toggleable jammer blocks: item id -> the world modifier shown while on. */
export const JAMMERS: ReadonlyMap<number, string> = new Map([
  [226, "JAMMED"],
  [1276, "NOPUNCH"],
  [1278, "IMMUNE"],
  [3616, "GUARDED"],
  [4758, "MINIMOD"],
  [4884, "NOWAR"],
]);

/** The signal jammer hides its world from the world list. */
export const SIGNAL_JAMMER = 226;

/** Sheet music tempo of a world without a world lock. */
export const DEFAULT_MUSIC_BPM = 100;

export enum TileFlags {
  TILEEXTRA = 0x0001,
  LOCKED = 0x0002,
  WAS_SPLICED = 0x0004,
  WILL_SPAWN_SEEDS_TOO = 0x0008,
  SEED = 0x0010,
  TREE = 0x0019,
  FLIPPED = 0x0020,
  ROTATED_LEFT = 0x0030,
  OPEN = 0x0040,
  PUBLIC = 0x0080,
  SILENCED = 0x0200,
  WATER = 0x0400,
  FIRE = 0x1000,
  RED = 0x2000,
  BLUE = 0x8000,
  GREEN = 0x4000,
  YELLOW = 0x6000,
  PURPLE = 0xa000,
}

/**
 * Client alternate-sprite bit (the world format's `FG_ALT_MODE`). Blocks with
 * a second frame switch to it: drilled Ice Crust Blocks and opened Uranium
 * Blocks use it for the fishing hole, music blocks use it for "silenced".
 */
export const TILE_ALT_MODE = 0x0200;

export enum TileExtraTypes {
  NONE = 0,
  DOOR = 1,
  SIGN = 2,
  LOCK = 3,
  SEED = 4,
  MAILBOX = 6,
  BULLETIN = 7,
  DICE = 8,
  PROVIDER = 9,
  ACHIEVEMENT = 10,
  HEART_MONITOR = 11,
  DONATION_BLOCK = 12,
  TOYBOX = 13,
  MANNEQUIN = 14,
  MAGIC_EGG = 15,
  GAME_RESOURCES = 16,
  GAME_GENERATOR = 17,
  XENONITE = 18,
  DRESSUP = 19,
  CRYSTAL = 20,
  BURGLAR = 21,
  SPOTLIGHT = 22,
  DISPLAY_BLOCK = 23,
  VENDING_MACHINE = 24,
  FISHTANK = 25,
  SOLAR = 26,
  FORGE = 27,
  GIVING_TREE = 28,
  GIVING_TREE_STUMP = 29,
  STEAM_ORGAN = 30,
  TAMAGOTCHI = 31,
  SWING = 32,
  FLAG = 33,
  LOBSTER_TRAP = 34,
  ART_CANVAS = 35,
  BATTLE_CAGE = 36,
  PET_TRAINER = 37,
  STEAM_ENGINE = 38,
  LOCKBOT = 39,
  WEATHER_SPECIAL = 40,
  SPIRIT_STORAGE = 41,
  DATA_BEDROCK = 42,
  DISPLAY_SHELF = 43,
  VIP_ENTRANCE = 44,
  CHALLENGE_TIMER = 45,
  CHALLENGE_FLAG = 46,
  FISH_MOUNT = 47,
  PORTRAIT = 48,
  WEATHER_SPECIAL2 = 49,
  FOSSIL_PREP = 50,
  DNA_MACHINE = 51,
  TRAINING_PORT = 61,
  MAGPLANT = 62,
  GROWSCAN = 66,
  TESSERACT_MANIPULATOR = 69,
  GAIA_HEART = 70,
  TECHNO_ORGANIC_ENGINE = 71,
  WEATHER_INFINITY = 77,
  KRANKEN_GALACTIC = 80,
}

export enum TileCollisionTypes {
  NONE = 0,
  NORMAL = 1,
  JUMP_THROUGH = 2,
  GATEWAY = 3,
  IF_OFF = 4,
  ONE_WAY = 5,
  VIP = 6,
  WATERFALL = 7,
  ADVENTURE = 8,
  IF_ON = 9,
  TEAM_ENTRANCE = 10,
  GUILD = 11,
  CLOUD = 12,
  FRIEND_ENTRANCE = 13,
}

/** items.dat `type` field (item action type). */
export enum ActionTypes {
  FIST = 0,
  WRENCH = 1,
  DOOR = 2,
  LOCK = 3,
  GEMS = 4,
  TREASURE = 5,
  DEADLY_BLOCK = 6,
  TRAMPOLINE = 7,
  CONSUMABLE = 8,
  GATEWAY = 9,
  SIGN = 10,
  SFX_WITH_EXTRA_FRAME = 11,
  BOOMBOX = 12,
  MAIN_DOOR = 13,
  PLATFORM = 14,
  BEDROCK = 15,
  LAVA = 16,
  FOREGROUND = 17,
  BACKGROUND = 18,
  SEED = 19,
  CLOTHES = 20,
  FOREGROUND_WITH_EXTRA_FRAME = 21,
  BACKGD_SFX_EXTRA_FRAME = 22,
  BACK_BOOMBOX = 23,
  BOUNCY = 24,
  POINTY = 25,
  PORTAL = 26,
  CHECKPOINT = 27,
  SHEET_MUSIC = 28,
  ICE = 29,
  SWITCHEROO = 31,
  CHEST = 32,
  MAILBOX = 33,
  BULLETIN = 34,
  PINATA = 35,
  DICE = 36,
  CHEMICAL = 37,
  PROVIDER = 38,
  LAB = 39,
  ACHIEVEMENT = 40,
  WEATHER_MACHINE = 41,
  SCORE_BOARD = 42,
  SUNGATE = 43,
  PROFILE = 44,
  DEADLY_IF_ON = 45,
  HEART_MONITOR = 46,
  DONATION_BOX = 47,
  TOYBOX = 48,
  MANNEQUIN = 49,
  SECURITY_CAMERA = 50,
  MAGIC_EGG = 51,
  GAME_RESOURCES = 52,
  GAME_GENERATOR = 53,
  XENONITE = 54,
  DRESSUP = 55,
  CRYSTAL = 56,
  BURGLAR = 57,
  COMPACTOR = 58,
  SPOTLIGHT = 59,
  WIND = 60,
  DISPLAY_BLOCK = 61,
  VENDING_MACHINE = 62,
  FISHTANK = 63,
  PETFISH = 64,
  SOLAR = 65,
  FORGE = 66,
  GIVING_TREE = 67,
  GIVING_TREE_STUMP = 68,
  STEAMPUNK = 69,
  STEAM_LAVA_IF_ON = 70,
  STEAM_ORGAN = 71,
  TAMAGOTCHI = 72,
  SWING = 73,
  FLAG = 74,
  LOBSTER_TRAP = 75,
  ART_CANVAS = 76,
  BATTLE_CAGE = 77,
  PET_TRAINER = 78,
  STEAM_ENGINE = 79,
  LOCKBOT = 80,
  WEATHER_SPECIAL = 81,
  SPIRIT_STORAGE = 82,
  DISPLAY_SHELF = 83,
  VIP_ENTRANCE = 84,
  CHALLENGE_TIMER = 85,
  CHALLENGE_FLAG = 86,
  FISH_MOUNT = 87,
  PORTRAIT = 88,
  WEATHER_SPECIAL2 = 89,
  FOSSIL = 90,
  FOSSIL_PREP = 91,
  DNA_MACHINE = 92,
  BLASTER = 93,
  VALHOWLA = 94,
  CHEMSYNTH = 95,
  CHEMTANK = 96,
  STORAGE = 97,
  OVEN = 98,
  SUPER_MUSIC = 99,
  GEIGER_CHARGER = 100,
  ADVENTURE_RESET = 101,
  TOMB_ROBBER = 102,
  FACTION = 103,
  RED_FACTION = 104,
  GREEN_FACTION = 105,
  BLUE_FACTION = 106,
  ANCES = 107,
  FISHGOTCHI_TANK = 109,
  FISHING_BLOCK = 110,
  ITEM_SUCKER = 111,
  ITEM_PLANTER = 112,
  ROBOT = 113,
  COMMAND = 114,
  TICKET = 115,
  STATS_BLOCK = 116,
  FIELD_NODE = 117,
  OUIJA_BOARD = 118,
  ARCHITECT_MACHINE = 119,
  STARSHIP = 120,
  AUTODELETE = 121,
  GREEN_FOUNTAIN = 122,
  AUTO_ACTION_BREAK = 123,
  AUTO_ACTION_HARVEST = 124,
  AUTO_ACTION_HARVEST_SUCK = 125,
  LIGHTNING_IF_ON = 126,
  PHASED_BLOCK = 127,
  MUD = 128,
  ROOT_CUTTING = 129,
  PASSWORD_STORAGE = 130,
  PHASED_BLOCK_2 = 131,
  BOMB = 132,
  WEATHER_INFINITY = 134,
  SLIME = 135,
  UNK1 = 136,
  COMPLETIONIST = 137,
  UNK3 = 138,
  FEEDING_BLOCK = 140,
  KRANKENS_BLOCK = 141,
  FRIENDS_ENTRANCE = 142,
}

/** What a lock allows the players that have access to it to do. */
export enum LockPermission {
  NONE = 0,
  BUILD = 1 << 0,
  BREAK = 1 << 1,
  FULL = BUILD | BREAK,
}

/** items.dat `flags` field. */
export enum BlockFlags {
  MULTI_FACING = 1 << 0,
  WRENCHABLE = 1 << 1,
  /** This item never drops any seeds. */
  SEEDLESS = 1 << 2,
  /** Smashing it returns it to the backpack instead of dropping. */
  PERMANENT = 1 << 3,
  DROPLESS = 1 << 4,
  NO_SELF = 1 << 5,
  NO_SHADOW = 1 << 6,
  WORLD_LOCKED = 1 << 7,
  BETA = 1 << 8,
  AUTO_PICKUP = 1 << 9,
  /** Unbreakable / mod-only item (bedrock, main door, ...). */
  MOD = 1 << 10,
  RANDOM_GROW = 1 << 11,
  /** Anyone can smash it even when locked. */
  PUBLIC = 1 << 12,
  FOREGROUND = 1 << 13,
  HOLIDAY = 1 << 14,
  UNTRADEABLE = 1 << 15,
}

/** items.dat `flags2` field. */
export enum BlockFlags2 {
  ROBOT_DEADLY = 1 << 1,
  ROBOT_SHOOT_LEFT = 1 << 2,
  ROBOT_SHOOT_RIGHT = 1 << 3,
  ROBOT_SHOOT_DOWN = 1 << 4,
  ROBOT_SHOOT_UP = 1 << 5,
  ROBOT_CAN_SHOOT = 1 << 6,
  ROBOT_LAVA = 1 << 7,
  ROBOT_POINTY = 1 << 8,
  ROBOT_SHOOT_DEADLY = 1 << 9,
  GUILD_ITEM = 1 << 10,
  GUILD_FLAG = 1 << 11,
  STARSHIP_HELM = 1 << 12,
  STARSHIP_REACTOR = 1 << 13,
  STARSHIP_VIEW_SCREEN = 1 << 14,
  SUPER_MOD = 1 << 15,
  TILE_DEADLY_IF_ON = 1 << 16,
  LONG_HAND_ITEM64X32 = 1 << 17,
  GEMLESS = 1 << 18,
  TRANSMUTABLE = 1 << 19,
  DUNGEON_ITEM = 1 << 20,
  PVE_MELEE = 1 << 21,
  PVE_RANGED = 1 << 22,
  PVE_AUTO_AIM = 1 << 23,
  ONE_IN_WORLD = 1 << 24,
  ONLY_FOR_WORLD_OWNER = 1 << 25,
  NO_UPGRADE = 1 << 26,
  EXTINGUISH_FIRE = 1 << 27,
  EXTINGUISH_FIRE_NO_DAMAGE = 1 << 28,
  NEED_RECEPTION_DESK = 1 << 29,
  USE_PAINT = 1 << 30,
}

/** Area locks: how many tiles each one can own. */
export const LOCKS = [
  { id: 202, maxTiles: 10, defaultPermission: LockPermission.FULL }, // Small Lock
  { id: 204, maxTiles: 48, defaultPermission: LockPermission.FULL }, // Big Lock
  { id: 206, maxTiles: 200, defaultPermission: LockPermission.FULL }, // Huge Lock
  { id: 4994, maxTiles: 200, defaultPermission: LockPermission.BREAK }, // Builder's Lock
];
