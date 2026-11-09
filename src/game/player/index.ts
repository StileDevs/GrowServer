import type { Peer, Packet } from "growtopia.wasm";
import { VariantHandler } from "../packets/variants";
import { PlayerInventory } from "./inventory";
import { PlayerAuth } from "./auth";
import { PlayerWorld } from "./world";
import { ActionsHandler } from "../packets/actions";
import { GamePacketHandler, type CharacterData, DEFAULT_CHARACTER_DATA } from "../packets/game-packet-handler";
import { LOGON_MODE } from "../../constants";
import { PlayerDB } from "../../database/services/player-db";

export * from "./inventory";
export * from "./world";
export * from "../packets/game-packet-handler";

export interface PlayerStateWorld {
  name: string;
}

export interface PlayerState {
  x: number;
  y: number;
  status: number; // bitwise flags
  isMod: boolean;
  isMuted: boolean;
  world: PlayerStateWorld;
}

export enum PlayerStateFlags {
  LOGIN_REQUEST = 1 << 0,
  ENTERING_GAME = 1 << 1,
  IN_GAME = 1 << 2,
  LOGOUT = 1 << 3,
}

export class Player {
  /** Global unique player identifier (e.g. "server-17091:0") */
  public id: string;
  /** Database unique player ID (primary key from database) */
  public playerId: number = 0;
  /** Current gem (bux) balance */
  public gems: number = 0;
  public netID: number;
  public serverLabel: string;
  public serverPort: number;
  public tankIDName = "";
  public displayName = "";
  public username = "";

  public variants: VariantHandler;
  public action: ActionsHandler;
  public get actions(): ActionsHandler {
    return this.action;
  }
  public gamePacket: GamePacketHandler;
  public inventory: PlayerInventory = new PlayerInventory(this);
  public auth: PlayerAuth = new PlayerAuth();
  public world: PlayerWorld = new PlayerWorld(this);
  public charData: CharacterData = { ...DEFAULT_CHARACTER_DATA };
  public get characterData(): CharacterData {
    return this.charData;
  }

  /** Custom override punch effect ID */
  public customPunchID?: number;

  /**
   * Retrieves the active punch effect ID of the player.
   * Returns 0 for now as requested.
   */
  public getPunchID(): number {
    if (typeof this.customPunchID === "number") {
      return this.customPunchID;
    }
    return 0;
  }

  /**
   * Shortcut to send character physics and punch state packet.
   * Delegates directly to `this.gamePacket.sendCharacterState(...)`.
   */
  public sendCharacterState(punchID?: number, everyPeer = true): void {
    this.gamePacket.sendCharacterState(punchID, everyPeer);
  }

  /**
   * Sends current gems to client via OnSetBux.
   * @param skipAnimation Whether to skip the bouncing animation.
   */
  public sendGems(skipAnimation = false): void {
    this.variants.sendOnSetBux(this.gems, skipAnimation);
  }

  /**
   * Sets player's gems and updates the client via OnSetBux.
   * @param amount New gem amount.
   * @param skipAnimation Whether to skip the bouncing animation.
   */
  public setGems(amount: number, skipAnimation = false): void {
    this.gems = Math.max(0, amount);
    this.variants.sendOnSetBux(this.gems, skipAnimation);
  }

  /**
   * Modifies player's gems, updates the client via OnSetBux,
   * and persists the change to the database.
   * @param amount Gem amount to add (can be negative).
   * @param skipAnimation Whether to skip the bouncing animation.
   */
  public async addGems(amount: number, skipAnimation = false): Promise<number> {
    this.gems = Math.max(0, this.gems + amount);
    this.variants.sendOnSetBux(this.gems, skipAnimation);
    if (this.playerId > 0) {
      await PlayerDB.addGems(this.playerId, amount);
    }
    return this.gems;
  }

  public state: PlayerState = {
    x: 0,
    y: 0,
    status: 0,
    isMod: false,
    isMuted: false,
    world: { name: "" },
  };

  public get currentWorld(): string {
    return this.state.world.name;
  }

  constructor(
    public peer: Peer,
    serverLabel: string,
    serverPort: number,
  ) {
    this.netID = peer.id;
    this.serverLabel = serverLabel;
    this.serverPort = serverPort;
    this.id = `${serverLabel}:${peer.id}`;
    this.variants = new VariantHandler(peer);
    this.action = new ActionsHandler(peer);
    this.gamePacket = new GamePacketHandler(this);
  }



  public addStateStatus(flag: PlayerStateFlags): void {
    this.state.status |= flag;
  }

  public removeStateStatus(flag: PlayerStateFlags): void {
    this.state.status &= ~flag;
  }

  public hasStateStatus(flag: PlayerStateFlags): boolean {
    return (this.state.status & flag) !== 0;
  }

  /**
   * Sends OnSendToServer variant packet to redirect player to another server or world.
   * Uses unique database playerId instead of transient peer netID.
   */
  public sendOnSendToServer(address?: string, port?: number, doorID: string = "", logonMode: LOGON_MODE = LOGON_MODE.WELCOME, token?: number): void {
    this.variants.sendOnSendToServer(address, port, this.playerId, doorID, logonMode, this.displayName || this.tankIDName, token);
  }

  /** Send a packet to this player */
  public send(packet: Packet): void {
    this.peer.send(packet);
  }

  /** Disconnect this player */
  public disconnect(data?: number): void {
    this.peer.disconnect(data);
  }

  /** Disconnect this player immediately */
  public disconnectNow(data?: number): void {
    this.peer.disconnectNow(data);
  }

  /** Disconnect this player after queued packets are sent */
  public disconnectLater(data?: number): void {
    this.peer.disconnectLater(data);
  }
}
