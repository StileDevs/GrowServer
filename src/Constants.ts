export enum PacketType {
  HELLO = 1,
  STR = 2,
  ACTION = 3,
  TANK = 4
}

export const WORLD_SIZE = {
  WIDTH: 100,
  HEIGHT: 60
};

export const STRING_CIPHER_KEY = "PBG892FXX982ABC*";
export const Y_START_DIRT = 24;
export const Y_LAVA_START = 50;
export const Y_END_DIRT = 55;

export const ROLE = {
  DEVELOPER: "1",
  BASIC: "2",
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
  [ClothTypes.ANCES]: "ances",
  [ClothTypes.BACK]: "back",
  [ClothTypes.FACE]: "face",
  [ClothTypes.FEET]: "feet",
  [ClothTypes.HAIR]: "hair",
  [ClothTypes.HAND]: "hand",
  [ClothTypes.MASK]: "mask",
  [ClothTypes.NECKLACE]: "necklace",
  [ClothTypes.PANTS]: "pants",
  [ClothTypes.SHIRT]: "shirt"
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
