import { join } from "path";
import { serverConfig } from "./configs/server-config";
export const CACHE_PATH = ".cache";

// Https handles server_data.php
export const HTTPS = {
  TLS_CERT_PATH: join(CACHE_PATH, "tls/cert.pem"),
  TLS_KEY_PATH: join(CACHE_PATH, "tls/key.pem"),
  PORT: 17900, // will reverse proxied to 443 later on Caddyfile
  HOST: "0.0.0.0",
  get LOGIN_URL(): string {
    return serverConfig?.server?.login_domain || "login.growserver.test";
  },
  USER_AGENT: "UbiServices_SDK_2022.Release.9_PC64_ansi_static",
};

// Login server (we i just did is redirect and let growtopia handle the validation)
export const LOGIN = {
  PORT: 17901,
  HOST: "0.0.0.0",
};

// CDN static assets server (serves custom-items with fallback to default_cdn_server)
export const CDN = {
  PORT: 17902,
  HOST: "0.0.0.0",
};

export enum LOGIN_TYPE {
  /** Registered nor logged in, they are just showed up in login/register dialog*/
  NONE = "0",
  REGISTER = "1",
  LOGIN = "2",
}

export enum PLATFORM_ID {
  UNKNOWN = -1,
  WINDOWS,
  IOS, //iPhone/iPad etc
  OSX,
  LINUX,
  ANDROID,
  WINDOWS_MOBILE, //yeah, right.  Doesn't look like we'll be porting here anytime soon.
  WEBOS,
  BBX, //RIM Playbook
  FLASH,
  HTML5, //javascript output via emscripten for web
  PSVITA,

  //new platforms will be added above here.  Don't count on PLATFORM_ID_COUNT not changing!
  COUNT,
}

// Game packet types
export enum PACKET_TYPE {
  UNKNOWN,
  SERVER_HELLO,
  GENERIC_TEXT,
  GAME_MESSAGE,
  GAME_PACKET,
  ERROR,
  TRACK,
  CLIENT_LOG_REQUEST,
  CLIENT_LOG_RESPONSE,
}

export enum LOGON_MODE {
  WELCOME = 1,
  TRANSFER = 2,
}

export const TANK_HEADER_SIZE = 56;

/** alias for GameUpdatePacket types */
export enum TANK_PACKET_TYPE {
  STATE,
  CALL_FUNCTION,
  UPDATE_STATUS,
  TILE_CHANGE_REQUEST,
  SEND_MAP_DATA,
  SEND_TILE_UPDATE_DATA,
  SEND_TILE_UPDATE_DATA_MULTIPLE,
  TILE_ACTIVATE_REQUEST,
  TILE_APPLY_DAMAGE,
  SEND_INVENTORY_STATE,
  ITEM_ACTIVATE_REQUEST,
  ITEM_ACTIVATE_OBJECT_REQUEST,
  SEND_TILE_TREE_STATE,
  MODIFY_ITEM_INVENTORY,
  ITEM_CHANGE_OBJECT,
  SEND_LOCK,
  SEND_ITEM_DATABASE_DATA,
  SEND_PARTICLE_EFFECT,
  SET_ICON_STATE,
  ITEM_EFFECT,
  SET_CHARACTER_STATE,
  PING_REPLY,
  PING_REQUEST,
  GOT_PUNCHED,
  APP_CHECK_RESPONSE,
  APP_INTEGRITY_FAIL,
  DISCONNECT,
  BATTLE_JOIN,
  BATTLE_EVENT,
  USE_DOOR,
  SEND_PARENTAL,
  GONE_FISHIN,
  STEAM,
  PET_BATTLE,
  NPC,
  SPECIAL,
  SEND_PARTICLE_EFFECT_V2,
  ACTIVE_ARROWO_ITEM,
  SELECTILE_INDEX,
  SEND_PLAYER_TRIBUTE_DATA,
  ON_STEP_ONILE_MOD,
}

export enum TANK_PACKET_FLAGS {
  NONE = 0,
  UNK = 1 << 1,
  RESET_VISUAL_STATE = 1 << 2,
  EXTENDED_DATA = 1 << 3,
  FACING_LEFT = 1 << 4,
  ON_GROUND = 1 << 5,
  ON_BURN = 1 << 6,
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
  ON_ICE = 1 << 17,
  ON_HAND_ITEM_ACTIVE = 1 << 18,
  ON_BACK_ITEM_ACTIVE = 1 << 19,
  ON_UNDERWATER = 1 << 20,
  ON_WALL_HANG = 1 << 21,
  ON_CHARGING_PUNCH = 1 << 22,
  ON_CHARGING_PUNCH_END = 1 << 23,
  ON_CHARGING_PUNCH_LEVEL_UP = 1 << 24,
  ON_HAY_CART_VISUALS = 1 << 25,
  ON_DOUBLE_JUMP_ACTIVE = 1 << 26,
  ON_EXTRA_TILE_INFO = 1 << 27,
  ON_ACID_DAMAGE = 1 << 28,
  ON_TELEPORT = 1 << 29,
  ON_USE_ABILITY = 1 << 30,
  // MAX = 31
}
