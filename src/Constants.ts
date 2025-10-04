export const ITEMS_DAT_URL = "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/refs/heads/main";
export const ITEMS_DAT_FETCH_URL = "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/refs/heads/main/latest.json";

export enum PacketTypes {
  HELLO = 1,
  STR = 2,
  ACTION = 3,
  TANK = 4
}

export const WORLD_SIZE = {
  WIDTH:  100,
  HEIGHT: 60
};

export const STRING_CIPHER_KEY = "PBG892FXX982ABC*";
export const Y_START_DIRT = 24;
export const Y_LAVA_START = 50;
export const Y_END_DIRT = 55;

export const ROLE = {
  DEVELOPER: "1",
  BASIC:     "2",
  SUPPORTER: "3"
};

export enum ClothTypes {
  HAIR = 0,
  SHIRT = 1,
  PANTS = 2,
  FEET = 3,
  FACE = 4,
  HAND = 5,
  BACK = 6,
  MASK = 7,
  NECKLACE = 8,
  ANCES = 9
}

export const CLOTH_MAP: { [key in ClothTypes]: string } = {
  [ClothTypes.ANCES]:    "ances",
  [ClothTypes.BACK]:     "back",
  [ClothTypes.FACE]:     "face",
  [ClothTypes.FEET]:     "feet",
  [ClothTypes.HAIR]:     "hair",
  [ClothTypes.HAND]:     "hand",
  [ClothTypes.MASK]:     "mask",
  [ClothTypes.NECKLACE]: "necklace",
  [ClothTypes.PANTS]:    "pants",
  [ClothTypes.SHIRT]:    "shirt"
};

export enum TankTypes {
  STATE = 0,
  CALL_FUNCTION = 1,
  UPDATE_STATUS = 2,
  TILE_CHANGE_REQUEST = 3,
  SEND_MAP_DATA = 4,
  SEND_TILE_UPDATE_DATA = 5,
  SEND_TILE_UPDATE_DATA_MULTIPLE = 6,
  TILE_ACTIVATE_REQUEST = 7,
  TILE_APPLY_DAMAGE = 8,
  SEND_INVENTORY_STATE = 9,
  ITEM_ACTIVATE_REQUEST = 10,
  ITEM_ACTIVATE_OBJECT_REQUEST = 11,
  SEND_TILE_TREE_STATE = 12,
  MODIFY_ITEM_INVENTORY = 13,
  ITEM_CHANGE_OBJECT = 14,
  SEND_LOCK = 15,
  SEND_ITEM_DATABASE_DATA = 16,
  SEND_PARTICLE_EFFECT = 17,
  SET_ICON_STATE = 18,
  ITEM_EFFECT = 19,
  SET_CHARACTER_STATE = 20,
  PING_REPLY = 21,
  PING_REQUEST = 22,
  GOT_PUNCHED = 23,
  APP_CHECK_RESPONSE = 24,
  APP_INTEGRITY_FAIL = 25,
  DISCONNECT = 26,
  BATTLE_JOIN = 27,
  BATTLE_EVEN = 28,
  USE_DOOR = 29,
  SEND_PARENTAL = 30,
  GONE_FISHIN = 31,
  STEAM = 32,
  PET_BATTLE = 33,
  NPC = 34,
  SPECIAL = 35,
  SEND_PARTICLE_EFFECT_V2 = 36,
  ACTIVE_ARROW_TO_ITEM = 37,
  SELECT_TILE_INDEX = 38,
  SEND_PLAYER_TRIBUTE_DATA = 39
}

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
  PURPLE = 0xa000
}

export enum TileExtraTypes {
  NONE = 0,
  DOOR = 1,
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  MAIN_DOOR = 1,
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
  DESSUP = 19,
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
  UNKNOWN_1 = 42,
  DISPLAY_SHELF = 43,
  VIP_ENTRANCE = 44,
  CHALLENGE_TIMER = 45,
  CHALLENGE_FLAG = 46,
  FISH_MOUNT = 47,
  PORTRAIT = 48,
  WEATHER_SPECIAL2 = 49,
  FOSSIL_PREP = 50,
  DNA_MACHINE = 51,

  MAGPLANT = 0x3e,
  GROWSCAN = 66,
  TESSERACT_MANIPULATOR = 0x45,
  GAIA_HEART = 0x46,
  TECHNO_ORGANIC_ENGINE = 0x47,
  KRANKEN_GALACTIC = 0x50,
  WEATHER_INFINITY = 0x4d
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
  FRIEND_ENTRANCE = 13
}

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
  FRIENDS_ENTRANCE = 142
}
// allowed actions from the lock
export enum LockPermission {
  NONE = 0, // those who dont have any access, will not be allowed to do anything
  BUILD = (1 << 0), // BUILD, means they can place item AND configure them with wrench
  BREAK = (1 << 1),
  FULL = BUILD | BREAK,
}

// NOTE: defaultPermission here means what action is allowed for those who has access.
// For example, Small lock allows the ones with access to do anything (Break & Build), 
//  and by default, doesnt allow the ones without access to do anything to it, unless 
//  if the TileFlags.PUBLIC is set.
export const LOCKS = [
  {
    id:                202, // Small Lock
    maxTiles:          10,
    defaultPermission: LockPermission.FULL,
  },
  {
    id:                204, // Big Lock
    maxTiles:          48,
    defaultPermission: LockPermission.FULL,
  },
  {
    id:                206, // Huge Lock
    maxTiles:          200,
    defaultPermission: LockPermission.FULL,
  },
  {
    id:                4994, // Builder's Lock
    maxTiles:          200,
    defaultPermission: LockPermission.BREAK,
  }
];

export const TileIgnore = {
  blockIDsToIgnoreByLock:   [6, 8],
  blockActionTypesToIgnore: [ActionTypes.LOCK, ActionTypes.MAIN_DOOR, ActionTypes.BEDROCK]
};

export enum BlockFlags {
  MULTI_FACING = 1 << 0,
  WRENCHABLE = 1 << 1,
  SEEDLESS = 1 << 2, // This item never drops any seeds.
  PERMANENT = 1 << 3, // This item is permanent.
  DROPLESS = 1 << 4, // DROPLESS
  NO_SELF = 1 << 5, // This item can't be used on yourself.
  NO_SHADOW = 1 << 6, // This item has no shadow.
  WORLD_LOCKED = 1 << 7, // This item can only be used in World-Locked worlds.
  BETA = 1 << 8, // This item is a beta item.
  AUTO_PICKUP = 1 << 9, // This item can't be destroyed - smashing it will return it to your backpack if you have room!
  MOD = 1 << 10, // This item is a mod item.
  RANDOM_GROW = 1 << 11, // A tree of this type can bear surprising fruit!
  PUBLIC = 1 << 12, // This item is PUBLIC: Even if it's locked, anyone can smash it.
  FOREGROUND = 1 << 13, // This item is a foreground item.
  HOLIDAY = 1 << 14, // This item can only be created during WinterFest!
  UNTRADEABLE = 1 << 15, // This item can't be dropped or traded.
}

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

export enum NameStyles {
  // Titles
  MAX_LEVEL = "maxLevel",
  DOCTOR = "doctor",
  MENTOR = "3",
  GROW4GOOD = "grow4good",
  THANKSGIVING = "thanksgiving",
  YOUTUBE = "youtube",
  TIKTOK = "tiktok",
  MASTER = "master",
  DONOR = "donor",
  EUPHORIA = "euphoria",
  SHOW_GUILD = "showGuild",

  // Special assignment method
  LEGENDARY = " of Legend``",

  // Colors!
  DEVELOPER = "`b",
  MOD = "`5",
  OWNER = "`2",
  ACCESS = "`^",
  GAME = "`a"
}

// Shop configuration
// Tab display Order
export const SHOP_TABS_ORDER = [
  "main",
  "locks",
  "itempack",
  "bigitems",
  "weather",
  "token"
] as const;

// Location for the Icon + Text
export const SHOP_TAB_INDEX: Record<string, number> = {
  main:     0,
  locks:    1,
  token:    2,
  itempack: 3,
  bigitems: 4,
  weather:  5
};

export const SHOP_WEATHER_TAB_DESC = "Tired of the same sunny sky?  We offer alternatives within...";

export const SHOP_LABEL_TO_CATEGORY: Record<string, string> = {
  main:      "main",
  locks:     "locks",
  packs:     "locks",
  bigitems:  "bigitems",
  itempack:  "itempack",
  weather:   "weather",
  token:     "token",
  growtoken: "token",
};

export enum CharacterState {
  WALK_IN_BLOCKS = 1 << 0,
  DOUBLE_JUMP = 1 << 1,
  IS_INVISIBLE = 1 << 2,
  NO_HANDS = 1 << 3,
  NO_EYES = 1 << 4,
  NO_BODY = 1 << 5,
  DEVIL_HORNS = 1 << 6,
  GOLDEN_HALO = 1 << 7,
  IS_FROZEN = 1 << 11,
  IS_CURSED = 1 << 12,
  IS_DUCTAPED = 1 << 13,
  HAVE_CIGAR = 1 << 14,
  IS_SHINING = 1 << 15,
  IS_ZOMBIE = 1 << 16,
  IS_HIT_BY_LAVA = 1 << 17,
  HAVE_HAUNTED_SHADOWS = 1 << 18,
  HAVE_GEIGER_RADIATION = 1 << 19,
  HAVE_REFLECTOR = 1 << 20,
  IS_EGGED = 1 << 21,
  HAVE_PINEAPPLE_FLOAT = 1 << 22,
  HAVE_FLYING_PINEAPPLE = 1 << 23,
  HAVE_SUPER_SUPPORTER_NAME = 1 << 24,
  HAVE_SUPER_PINEAPPLE = 1 << 25
}

export enum ModsEffects {
  HARVESTER = 1 << 0,
  PUNCH_DAMAGE = 1 << 1
}

export enum StateFlags {
  NONE = 0,
  UNK = 1 << 1,
  RESET_VISUAL_STATE = 1 << 2,
  EXTENDED = 1 << 3,
  ROTATE_LEFT = 1 << 4,
  ON_SOLID = 1 << 5,
  ON_FIRE_DAMAGE = 1 << 6,
  ON_JUMP = 1 << 7,
  ON_KILLED = 1 << 8,
  ON_PUNCHED = 1 << 9,
  ON_PLACED = 1 << 10,
  ON_TILE_ACTION = 1 << 11,
  ON_GOT_PUNCHED = 1 << 12,
  ON_RESPAWNED = 1 << 13,
  ON_COLLECT_OBJECT = 1 << 14,
  ON_TRAMPOLINE = 1 << 15,
  ON_DAMAGE = 1 << 16,
  ON_SLIDE = 1 << 17,
  ON_WALL_HANG = 1 << 21,
  ON_ACID_DAMAGE = 1 << 26
  // MAX = 31
}

export const weatherIdMap: Record<number, number> = {
  3694:  28,
  3832:  29,
  5000:  34,
  1490:  10,
  934:   2,
  946:   3,
  932:   4,
  984:   5,
  1210:  8,
  1364:  11,
  1750:  15,
  2046:  17,
  2284:  18,
  2744:  19,
  3252:  20,
  3446:  21,
  3534:  22,
  4242:  30,
  4486:  31,
  4776:  32,
  4892:  33,
  5112:  35,
  5654:  36,
  5716:  37,
  5958:  38,
  6854:  42,
  7644:  44,
  12054: 60,
  12056: 61,
  8896:  47,
  8836:  48,
  10286: 51,
  11880: 59,
  12408: 62,
  12844: 64,
  13004: 65,
  13070: 66
};

export interface BackpackTier {
  index: number;
  slots: number;
  price: number; // Gems required for this upgrade from previous tier
}

// Backpack tiers from 16 to 396 slots, +10 each step, with per-step gem costs
export const BACKPACK_TIERS: BackpackTier[] = [
  { index: 0, slots: 16, price: 0 },
  { index: 1, slots: 26, price: 100 },
  { index: 2, slots: 36, price: 200 },
  { index: 3, slots: 46, price: 500 },
  { index: 4, slots: 56, price: 1000 },
  { index: 5, slots: 66, price: 1700 },
  { index: 6, slots: 76, price: 2600 },
  { index: 7, slots: 86, price: 3700 },
  { index: 8, slots: 96, price: 5000 },
  { index: 9, slots: 106, price: 6500 },
  { index: 10, slots: 116, price: 8200 },
  { index: 11, slots: 126, price: 10100 },
  { index: 12, slots: 136, price: 12200 },
  { index: 13, slots: 146, price: 14500 },
  { index: 14, slots: 156, price: 17000 },
  { index: 15, slots: 166, price: 19700 },
  { index: 16, slots: 176, price: 22600 },
  { index: 17, slots: 186, price: 25700 },
  { index: 18, slots: 196, price: 29000 },
  { index: 19, slots: 206, price: 32500 },
  { index: 20, slots: 216, price: 36200 },
  { index: 21, slots: 226, price: 40100 },
  { index: 22, slots: 236, price: 44200 },
  { index: 23, slots: 246, price: 48500 },
  { index: 24, slots: 256, price: 53000 },
  { index: 25, slots: 266, price: 57700 },
  { index: 26, slots: 276, price: 62600 },
  { index: 27, slots: 286, price: 67700 },
  { index: 28, slots: 296, price: 73000 },
  { index: 29, slots: 306, price: 78500 },
  { index: 30, slots: 316, price: 84200 },
  { index: 31, slots: 326, price: 90100 },
  { index: 32, slots: 336, price: 96200 },
  { index: 33, slots: 346, price: 102500 },
  { index: 34, slots: 356, price: 109000 },
  { index: 35, slots: 366, price: 115700 },
  { index: 36, slots: 376, price: 122600 },
  { index: 37, slots: 386, price: 129700 },
  { index: 38, slots: 396, price: 137000 },
];

export const BACKPACK_MIN_SLOTS = BACKPACK_TIERS[0].slots;
export const BACKPACK_MAX_SLOTS = BACKPACK_TIERS[BACKPACK_TIERS.length - 1].slots;