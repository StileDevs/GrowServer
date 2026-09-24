import { GameUpdatePacket } from "./game-packet";
import { ExtendBuffer } from "../../utils/extend-buffer";
import { LOGON_MODE, TANK_PACKET_FLAGS, TANK_PACKET_TYPE } from "../../constants";
import type { Player, PlayerClothes } from "../player";
import { Packet, PacketKind, Peer } from "growtopia.wasm";
import { TextParser } from "../../utils/text-parser";
import { Color } from "../../utils/color";
import {
  itemsCompressed,
  itemsHash,
  itemsModifiedCompressed,
  itemsModifiedHash,
  itemsModifiedRaw,
  itemsRaw,
  playerTributeHash,
  playerTributeRaw,
} from "../item/item-info";
import { serverManager } from "../server/server-manager";
import { getServerAddress, serverConfig } from "../../configs/server-config";
import { DialogBuilder } from "../../utils/dialog-builder";

/**
 * Types for each Argument.
 */
export enum VariantTypes {
  NONE,
  FLOAT_1,
  STRING,
  FLOAT_2,
  FLOAT_3,
  UNSIGNED_INT,
  SIGNED_INT = 0x9,
}

/**
 * Growtopia Packet Types
 */
export enum PacketTypes {
  UNK,
  HELLO,
  STR,
  ACTION,
  TANK,
  ERROR,
  TRACK,
  CLIENT_LOG_REQ,
  CLIENT_LOG_RES,
}

/**
 * The argument type for the variant.
 */
export type VariantArg = string | number[] | number;

/**
 * Options for the Variant Packet
 */
export interface VariantOptions {
  /**
   * The netID of the variant.
   */
  netID?: number;

  /**
   * They delay (in ms) on when the client will execute the packet.
   */
  delay?: number;
}
export interface VariantTypeBase {
  index: number;
  type: number;
  typeName: string;
}

export interface VariantTypeNumber extends VariantTypeBase {
  value: number;
}

export interface VariantTypeFloat extends VariantTypeBase {
  value: number[];
}

export interface VariantTypeString extends VariantTypeBase {
  value: string;
}

export type VariantArray = VariantTypeString | VariantTypeNumber | VariantTypeFloat;

/**
 * Represents the Variant class.
 */
export class Variant {
  public index: number = 0;

  /**
   * Creates a new instance of the Variant class.
   * @param options The options for the variant.
   * @param args The arguments of the Variant.
   */
  constructor(
    public options: VariantOptions = {},
    public args: VariantArg[] = [],
  ) {}

  /**
   * Creates a new Variant class.
   * @param opts The options for the variant.
   * @param args The arguments of the Variant.
   */
  public static from(opts?: VariantOptions | VariantArg, ...args: VariantArg[]): Variant {
    if (typeof opts === "string" || typeof opts === "number" || Array.isArray(opts)) {
      args.unshift(opts);
      opts = { netID: -1, delay: 0 };
    }

    return new Variant(opts as VariantOptions, args);
  }

  /**
   * Converts buffer data to an array of Variant elements using ExtendBuffer.
   * @param data The buffer or ExtendBuffer data.
   */
  public static toArray(data: Buffer | number[] | ExtendBuffer): VariantArray[] {
    const extendBuf = data instanceof ExtendBuffer ? data : new ExtendBuffer(Array.from(data));
    const arr: VariantArray[] = [];

    extendBuf.mempos = 60;
    const count = extendBuf.readU8();

    for (let i = 1; i <= count; i++) {
      const index = extendBuf.readU8();
      const type = extendBuf.readU8();
      const typeName = VariantTypes[type] ?? "NONE";

      switch (type) {
        case VariantTypes.STRING: {
          const value = extendBuf.readString(4);
          arr.push({ index, type, typeName, value });
          break;
        }
        case VariantTypes.UNSIGNED_INT: {
          const value = extendBuf.readU32();
          arr.push({ index, type, typeName, value });
          break;
        }
        case VariantTypes.SIGNED_INT: {
          const value = extendBuf.readI32();
          arr.push({ index, type, typeName, value });
          break;
        }
        case VariantTypes.FLOAT_1: {
          const value = [extendBuf.readFloat()];
          arr.push({ index, type, typeName, value });
          break;
        }
        case VariantTypes.FLOAT_2: {
          const value = [extendBuf.readFloat(), extendBuf.readFloat()];
          arr.push({ index, type, typeName, value });
          break;
        }
        case VariantTypes.FLOAT_3: {
          const value = [extendBuf.readFloat(), extendBuf.readFloat(), extendBuf.readFloat()];
          arr.push({ index, type, typeName, value });
          break;
        }
      }
    }

    return arr;
  }

  /**
   * Parses the data of the Variant and returns a GameUpdatePacket from it.
   */
  public parse(): Buffer {
    const extendBuf = new ExtendBuffer(0);

    extendBuf.writeU8(this.args.length);

    this.args.forEach((arg) => {
      extendBuf.writeU8(this.index++);

      switch (typeof arg) {
        case "string": {
          extendBuf.writeU8(VariantTypes.STRING);
          extendBuf.writeString(arg, 4);
          break;
        }

        case "number": {
          if (arg < 0) {
            extendBuf.writeU8(VariantTypes.SIGNED_INT);
            extendBuf.writeI32(arg);
          } else {
            extendBuf.writeU8(VariantTypes.UNSIGNED_INT);
            extendBuf.writeU32(arg);
          }
          break;
        }

        case "object": {
          if (!Array.isArray(arg)) return;

          const type = VariantTypes[`FLOAT_${arg.length}` as "FLOAT_1" | "FLOAT_2" | "FLOAT_3"];
          if (!type) return;

          extendBuf.writeU8(type);
          arg.forEach((floatVal) => {
            extendBuf.writeFloat(floatVal);
          });
          break;
        }
      }
    });

    const tank = GameUpdatePacket.from({
      type: TANK_PACKET_TYPE.CALL_FUNCTION,
      objectType: 0,
      jumpCount: 0,
      buildRange: 0,
      netID: this.options.netID ?? -1,
      targetNetID: 0,
      flags: TANK_PACKET_FLAGS.EXTENDED_DATA,
      float_var: this.options.delay ?? 0,
      itemID: 0,
      posX: 0,
      posY: 0,
      speedX: 0,
      speedY: 0,
      particleID: 0,
      tileX: 0,
      tileY: 0,
      extraDataLength: extendBuf.data.length,
      extraData: extendBuf.data,
    }).parse()!;

    return tank;
  }
}

export interface SpawnOptions {
  spawnType?: "avatar";
  netID?: number;
  userID?: number;
  x?: number;
  y?: number;
  displayName?: string;
  country?: string;
  invis?: number;
  mstate?: number;
  smstate?: number;
  onlineID?: string;
  type?: string;
}

export class VariantHandler {
  constructor(private peer: Peer) {}

  private send(data: Buffer): void {
    const packet = new Packet(data, PacketKind.Reliable);
    this.peer.send(packet);
  }

  private createVariantNoNetID(...args: VariantArg[]): Variant {
    return new Variant({ netID: -1, delay: 0 }, args);
  }

  /**
   * Sends a console message to the client.
   */
  public sendOnConsoleMessage(message: string): void {
    const variant = this.createVariantNoNetID("OnConsoleMessage", message);
    const data = variant.parse();

    this.send(data);
  }

  /**
   * Spawns an object inside the world.
   * @param options Spawn options or player data.
   */
  public sendOnSpawn(options: SpawnOptions = {}): void {
    const text = new TextParser();
    text.add("spawn", options.spawnType ?? "avatar");
    text.add("netID", options.netID ?? 0);
    text.add("userID", options.userID ?? 0);
    text.add("colrect", 0, 0, 20, 30);
    text.add("posXY", options.x ?? 0, options.y ?? 0);
    text.add("name", `\`w${options.displayName ?? ""}\`\``);
    text.add("country", options.country ?? "");
    text.add("invis", options.invis ?? 0);
    text.add("mstate", options.mstate ?? 0);
    text.add("smstate", options.smstate ?? 0);
    text.add("onlineID", options.onlineID ?? "");
    text.add("type", options.type ?? "local");

    const variant = Variant.from({ delay: -1 }, "OnSpawn", text.toString());
    const data = variant.parse();

    this.send(data);
  }

  public sendOnDialogRequest(dialogData: string, delay: number = 100): void {
    const variant = Variant.from({ netID: -1, delay }, "OnDialogRequest", dialogData);
    const data = variant.parse();

    this.send(data);
  }

  public sendClothes(targetNetID: number, clothes: PlayerClothes, skinColor: Color) {
    if (!skinColor) skinColor = new Color(180, 138, 120, 255); // @TODO still hardcoded skin color

    const vec3ClothingData = [];

    const variant = Variant.from(
      { netID: targetNetID },
      "OnSetClothing",
      [clothes.hair, clothes.shirt, clothes.pants],
      [clothes.feet, clothes.face, clothes.hand],
      [clothes.back, clothes.mask, clothes.necklace],
      skinColor.toDecimal(),
      [clothes.ances, 0.0, 0.0],
    );

    const data = variant.parse();

    this.send(data);
  }

  public sendSuperMain() {
    const serverTick = Date.now() >>> 0;

    const settings = [
      "proto=216",
      "choosemusic=audio/mp3/about_theme.mp3",
      "active_holiday=6",
      "wing_week_day=0",
      "ubi_week_day=0",
      `server_tick=${serverTick}`,
      "clash_active=0",
      "drop_lavacheck_faster=1",
      "isPayingUser=0",
      "usingStoreNavigation=1",
      "enableInventoryTab=1",
      "bigBackpack=1",
      "",
    ].join("|");

    const anticheat =
      "cc.cz.madkite.freedom org.aqua.gg idv.aqua.bulldog com.cih.gamecih2 com.cih.gamecih com.cih.game_cih cn.maocai.gamekiller com.gmd.speedtime org.dax.attack com.x0.strai.frep com.x0.strai.free org.cheatengine.cegui org.sbtools.gamehack com.skgames.traffikrider org.sbtoods.gamehaca com.skype.ralder org.cheatengine.cegui.xx.multi1458919170111 com.prohiro.macro me.autotouch.autotouch com.cygery.repetitouch.free com.cygery.repetitouch.pro com.proziro.zacro com.slash.gamebuster";

    const cdnServer = serverConfig?.game.cdn_server || serverConfig?.game.default_cdn_server || "growserver-cache.netlify.app";
    const cdnServerPath = serverConfig?.game.cdn_server_path || "growtopia/";

    const variant = Variant.from(
      { netID: -1 },
      "OnSuperMainStartAcceptLogonHrdxs47254722215a",
      itemsModifiedHash,
      cdnServer,
      cdnServerPath,
      anticheat,
      settings,
      playerTributeHash,
    );

    const data = variant.parse();

    this.send(data);
  }

  public sendOnRefreshPlayerTributeData(): void {
    const tank = GameUpdatePacket.from({
      type: TANK_PACKET_TYPE.SEND_PLAYER_TRIBUTE_DATA,
      objectType: 0,
      jumpCount: 0,
      buildRange: 0,
      netID: -1,
      targetNetID: 0,
      flags: TANK_PACKET_FLAGS.EXTENDED_DATA,
      float_var: 0,
      itemID: 0,
      posX: 0,
      posY: 0,
      speedX: 0,
      speedY: 0,
      particleID: 0,
      tileX: 0,
      tileY: 0,
      extraDataLength: playerTributeRaw.length,
      extraData: Array.from(playerTributeRaw),
    }).parse()!;

    this.send(tank);
  }

  public sendOnSendToServer(
    address?: string,
    port?: number,
    playerId: number = 0,
    doorID: string = "",
    logonMode: LOGON_MODE = LOGON_MODE.WELCOME,
    displayName: string = "",
    token?: number,
  ): void {
    let targetPort = port;
    if (!targetPort) {
      const optimalServer = serverManager.getOptimalServer("least_connections");
      targetPort = optimalServer ? optimalServer.port : 17091;
    }

    const targetAddress = address ?? getServerAddress();
    const loginToken = token ?? Math.floor(Math.random() * (1000000 - 10000) + 10000);
    const variant = Variant.from(
      { netID: -1 },
      "OnSendToServer",
      targetPort,
      loginToken,
      playerId,
      `${targetAddress}|${doorID}|`,
      logonMode,
      // shows session username on main menu bottom left
      displayName,
    );

    const data = variant.parse();
    this.send(data);
  }

  public sendSetHasGrowID(isSet: boolean, playerName: string, sessionToken: string): void {
    const variant = this.createVariantNoNetID("SetHasGrowID", isSet ? 1 : 0, playerName, sessionToken);
    const data = variant.parse();
    this.send(data);
  }

  public sendItemData(): void {
    const tank = GameUpdatePacket.from({
      type: TANK_PACKET_TYPE.SEND_ITEM_DATABASE_DATA,
      objectType: 0,
      jumpCount: 0,
      buildRange: 0,
      netID: -1,
      targetNetID: 0,
      flags: TANK_PACKET_FLAGS.EXTENDED_DATA,
      float_var: 0,
      itemID: itemsModifiedRaw.length, // send actual item count so the client could inflate the compressed data
      posX: 0,
      posY: 0,
      speedX: 0,
      speedY: 0,
      particleID: 0,
      tileX: 0,
      tileY: 0,
      extraDataLength: itemsModifiedCompressed.length,
      extraData: Array.from(itemsModifiedCompressed),
    }).parse()!;

    this.send(tank);
  }

  public sendOnRequestWorldSelectMenu(): void {
    // @TODO hardcoded for now
    const worldMenuColor = 3529161471;
    const topWorlds = ["START", "START1", "START2"];

    const worldSelectMenu = `add_heading|Top Worlds|
${topWorlds.map((world) => `add_floater|${world}|0|0.5|${worldMenuColor}`).join("\n")}`;

    const variant = Variant.from({ netID: -1, delay: 0 }, "OnRequestWorldSelectMenu", worldSelectMenu);

    const data = variant.parse();
    this.send(data);
  }

  public sendGazette(): void {
    this.sendOnRequestWorldSelectMenu();

    const gazette = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("`wThe GrowServer Gazette``", "5016", "big")
      .addSpacer("small")
      .raw("add_image_button||growserver/interface/banner.rttex|bannerlayout|||\n")
      .addTextBox("Welcome to GrowServer")
      .addQuickExit()
      .endDialog("gazzette_end", "Cancel", "Ok")
      .str();

    const variant = Variant.from({ netID: -1, delay: 100 }, "OnDialogRequest", gazette);
    const data = variant.parse();
    this.send(data);
  }
}
