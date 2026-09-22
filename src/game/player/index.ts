import type { Peer, Packet } from "growtopia.wasm";
import { VariantHandler } from "../packets/variants";
import { PlayerInventory } from "./inventory";
import { PlayerAuth } from "./auth";
import { ActionsHandler } from "../packets/actions";
import { LOGON_MODE } from "../../constants";

export * from "./inventory";

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
  public netID: number;
  public serverLabel: string;
  public serverPort: number;
  public tankIDName = "";
  public displayName = "";

  public variants: VariantHandler;
  public actions: ActionsHandler;
  public inventory: PlayerInventory = new PlayerInventory();
  public auth: PlayerAuth = new PlayerAuth();

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
    this.actions = new ActionsHandler(peer);
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
  public sendOnSendToServer(
    address?: string,
    port?: number,
    doorID: string = "",
    logonMode: LOGON_MODE = LOGON_MODE.WELCOME,
    token?: number,
  ): void {
    this.variants.sendOnSendToServer(
      address,
      port,
      this.playerId,
      doorID,
      logonMode,
      this.tankIDName || this.displayName,
      token,
    );
  }

  /** Send a packet to this player */
  public send(packet: Packet): void {
    this.peer.send(packet);
  }

  /** Disconnect this player immediately */
  public disconnect(data?: number): void {
    this.peer.disconnect(data);
  }

  /** Disconnect this player after queued packets are sent */
  public disconnectLater(data?: number): void {
    this.peer.disconnectLater(data);
  }
}
