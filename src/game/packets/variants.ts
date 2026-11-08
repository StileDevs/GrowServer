import { GameUpdatePacket } from "./game-packet";
import { ExtendBuffer } from "../../utils/extend-buffer";
import { CLIENT_FEATURE_FLAG, LOGON_MODE, TANK_PACKET_FLAGS, TANK_PACKET_TYPE } from "../../constants";
import type { PlayerClothes, PlayerInventory } from "../player/inventory";
import { worldManager } from "../world/world-manager";
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

  /** Wraps the parsed variant into a reliable ENet packet. */
  public parsePacket(): Packet {
    return new Packet(this.parse(), PacketKind.Reliable);
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
      float_var: 0,
      // the client reads the variant delay (ms) from the int32 at offset 20
      itemID: this.options.delay ?? 0,
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
    try {
      this.peer.send(new Packet(data, PacketKind.Reliable));
    } catch {
      // the peer is already gone; nothing to deliver to
    }
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
    // only the receiving client's own avatar carries `type|local`
    if (options.type) text.add("type", options.type);

    // the client's line parser expects every entry, including the last one, to end with a newline
    const variant = Variant.from({ delay: -1 }, "OnSpawn", `${text.toString()}\n`);
    const data = variant.parse();

    this.send(data);
  }

  public sendOnDialogRequest(dialogData: string, delay: number = 100): void {
    const variant = Variant.from({ netID: -1, delay }, "OnDialogRequest", dialogData);
    const data = variant.parse();

    this.send(data);
  }

  /**
   * Sends OnSetClothing for an avatar.
   * @param skinColor Raw 32-bit skin color exactly as the client expects it (e.g. 0x8295c3ff).
   */
  public sendClothes(targetNetID: number, clothes: PlayerClothes, skinColor: number) {
    const variant = Variant.from(
      { netID: targetNetID },
      "OnSetClothing",
      [clothes.hair, clothes.shirt, clothes.pants],
      [clothes.feet, clothes.face, clothes.hand],
      [clothes.back, clothes.mask, clothes.necklace],
      skinColor >>> 0,
      [clothes.ances, 0.0, 0.0],
    );

    const data = variant.parse();

    this.send(data);
  }

  /**
   * Overrides the client's GDPR/age restrictions. Clients that report
   * `GDPR|1` keep chat disabled until the server confirms the player's age
   * and chat permission; the official server sends this before the logon
   * acceptance.
   */
  public sendOnOverrideGdprFromServer(age = 18, canChat = true): void {
    this.send(Variant.from("OnOverrideGDPRFromServer", age, canChat ? 1 : 0, 0, 1).parse());
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

  /** Sends any variant to this peer. */
  public sendVariant(variant: Variant): void {
    this.send(variant.parse());
  }

  public sendOnTalkBubble(netID: number, message: string, stacked = true): void {
    this.send(Variant.from("OnTalkBubble", netID, message, 0, stacked ? 1 : 0).parse());
  }

  public sendOnRemove(netID: number, playerId: number): void {
    this.send(Variant.from("OnRemove", `netID|${netID}`, `pId|${playerId}`).parse());
  }

  public sendOnSetCurrentWeather(weatherId: number): void {
    this.send(Variant.from("OnSetCurrentWeather", weatherId).parse());
  }

  public sendOnCountryState(netID: number, state: string): void {
    this.send(Variant.from({ netID }, "OnCountryState", state).parse());
  }

  public sendOnPlayPositioned(file: string, netID: number): void {
    this.send(Variant.from({ netID }, "OnPlayPositioned", file).parse());
  }

  public sendOnSetFreezeState(netID: number, frozen: boolean, delay = 0): void {
    this.send(Variant.from({ netID, delay }, "OnSetFreezeState", frozen ? 1 : 0).parse());
  }

  public sendOnKilled(netID: number): void {
    this.send(Variant.from({ netID }, "OnKilled").parse());
  }

  public sendOnSetPos(netID: number, x: number, y: number, delay = 0): void {
    this.send(Variant.from({ netID, delay }, "OnSetPos", [x, y]).parse());
  }

  public sendOnZoomCamera(zoom: number, duration: number): void {
    this.send(Variant.from("OnZoomCamera", [zoom], duration).parse());
  }

  public sendOnFailedToEnterWorld(): void {
    this.send(Variant.from("OnFailedToEnterWorld", 1).parse());
  }

  public sendOnTextOverlay(message: string): void {
    this.send(Variant.from("OnTextOverlay", message).parse());
  }

  /**
   * Updates the gem counter on the HUD.
   */
  public sendOnSetBux(gems: number, skipAnimation = false): void {
    const now = new Date();
    const secondsToday = Math.floor((now.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 1000);
    this.send(Variant.from("OnSetBux", gems, skipAnimation ? 1 : 0, 0, [secondsToday, 0, 0]).parse());
  }

  /**
   * Tells the client (5.47+) which of its features are on. Without this the
   * client treats the account as being in the tutorial and refuses to leave
   * the world ("you must complete the tutorial first"). Everything is enabled
   * except the two tutorial features, so REMOVE_TUTORIAL takes effect.
   */
  public sendOnSetFeatureEnableFlags(): void {
    const enabled = Object.values(CLIENT_FEATURE_FLAG).filter(
      (value): value is CLIENT_FEATURE_FLAG =>
        typeof value === "number" && value !== CLIENT_FEATURE_FLAG.HOME_WORLD_TUTORIAL && value !== CLIENT_FEATURE_FLAG.WRENCH_TUTORIAL,
    );
    const payload = Buffer.from([enabled.length, ...enabled]).toString("base64");
    this.send(Variant.from("OnSetFeatureEnableFlags", payload).parse());
  }

  /**
   * Sends the full backpack (SEND_INVENTORY_STATE). Equipped items carry bit 8 of the amount.
   */
  public sendInventoryState(inventory: PlayerInventory): void {
    const buffer = new ExtendBuffer(0);
    buffer.writeU8(0x1);
    buffer.writeU32(inventory.max);
    buffer.writeU16(inventory.items.size);
    for (const [itemId, amount] of inventory.items) {
      buffer.writeU16(itemId);
      buffer.writeU16(inventory.isEquipped(itemId) ? amount | (1 << 8) : amount);
    }

    const tank = GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.SEND_INVENTORY_STATE,
      netID: -1,
      extraData: buffer.data,
    }).parse()!;
    this.send(tank);
  }

  /**
   * Adds or removes items from the client's backpack view (MODIFY_ITEM_INVENTORY).
   * A positive delta adds, a negative one removes.
   */
  public sendModifyItemInventory(itemId: number, delta: number): void {
    if (delta === 0) return;
    const tank = GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.MODIFY_ITEM_INVENTORY,
      netID: -1,
      itemID: itemId,
      jumpCount: delta < 0 ? -delta : 0,
      buildRange: delta > 0 ? delta : 0,
    }).parse()!;
    this.send(tank);
  }

  /**
   * Builds the SET_CHARACTER_STATE packet for a player: modifiers, punch id and
   * the default movement values.
   */
  public buildCharacterState(netID: number, characterState: number, punchId: number): Buffer {
    const tank = GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.SET_CHARACTER_STATE,
      netID,
      itemID: characterState,
      posX: 1200,
      posY: 200,
      speedX: 300,
      speedY: 600,
    }).parse()!;

    // byte layout after the 4-byte packet type header
    tank.writeUInt8(punchId, 4 + 1); // objectType: punch effect id
    tank.writeUInt8(0x80, 4 + 2); // jumpCount: build range
    tank.writeUInt8(0x80, 4 + 3); // buildRange: punch range
    tank.writeFloatLE(125.0, 4 + 16); // float_var: water speed
    return tank;
  }

  /**
   * Shows the world select menu: the most populated worlds plus the player's
   * recently visited ones.
   */
  public sendOnRequestWorldSelectMenu(recentWorlds: string[] = [], delay = 0): void {
    const topColor = 3529161471;
    const recentColor = 3417414143;

    const populated = worldManager.mostPopulated(6);
    const topWorlds = ["START", "START1", "START2"].filter((name) => !populated.some((world) => world.name === name));

    const lines = ["add_heading|Top Worlds|"];
    for (const world of populated) lines.push(`add_floater|${world.name}|${world.players.length}|0.5|${topColor}`);
    for (const name of topWorlds) lines.push(`add_floater|${name}|${worldManager.getLoaded(name)?.players.length ?? 0}|0.5|${topColor}`);

    if (recentWorlds.length > 0) {
      lines.push("add_heading|Recently Visited Worlds<CR>|");
      for (const name of [...recentWorlds].reverse()) {
        lines.push(`add_floater|${name}|${worldManager.getLoaded(name)?.players.length ?? 0}|0.5|${recentColor}`);
      }
    }

    const variant = Variant.from({ netID: -1, delay }, "OnRequestWorldSelectMenu", lines.join("\n"));
    this.send(variant.parse());

    const online = serverManager.getTotalPlayersCount();
    this.send(Variant.from({ delay }, "OnConsoleMessage", `Where would you like to go? (\`w${online}\`\` online)`).parse());
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
