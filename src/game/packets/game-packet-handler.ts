import { Packet, PacketKind } from "growtopia.wasm";
import { TANK_PACKET_TYPE } from "../../constants";
import type { Player } from "../player";
import { GameUpdatePacket } from "./game-packet";

/**
 * Character physics, punch, and state data.
 */
export interface CharacterData {
  punchType: number;
  buildRange: number;
  punchRange: number;
  char2State: number;
  waterSpeed: number;
  charState: number;
  speed: number;
  punchPower: number;
  accel: number;
  gravity: number;
}

export const DEFAULT_CHARACTER_DATA: CharacterData = {
  punchType: 0,
  buildRange: 128,
  punchRange: 128,
  char2State: 0,
  waterSpeed: 125.0,
  charState: 0,
  speed: 250.0,
  punchPower: 0.0,
  accel: 1200.0,
  gravity: 1000.0,
};

/**
 * Options for sending character state updates.
 */
export interface SendCharacterStateOptions extends Partial<CharacterData> {
  punchID?: number;
  everyPeer?: boolean;
  targetPlayer?: Player;
}

/**
 * Handles GameUpdatePacket (tank packet) operations and character state synchronization for a Player.
 */
export class GamePacketHandler {
  constructor(private player: Player) {}

  /**
   * Sends a parsed GameUpdatePacket to the player's peer.
   */
  public send(tank: GameUpdatePacket): void {
    const data = tank.parse();
    if (!data) return;
    const packet = new Packet(data, PacketKind.Reliable);
    this.player.send(packet);
  }

  /**
   * Sends SET_CHARACTER_STATE packet with optional punchID and broadcast flag.
   *
   * @param punchID Optional punch effect ID (defaults to player.getPunchID())
   * @param everyPeer Whether to broadcast this state to all other players in the current world (defaults to true)
   */
  public sendCharacterState(punchID?: number, everyPeer?: boolean): void;

  /**
   * Sends SET_CHARACTER_STATE packet for another player or with specific overrides.
   *
   * @param targetPlayer Target player whose character state is being sent
   * @param overrides Optional character data overrides
   */
  public sendCharacterState(targetPlayer: Player, overrides?: Partial<CharacterData>): void;

  /**
   * Sends SET_CHARACTER_STATE packet with full options object.
   *
   * @param options Full configuration options
   */
  public sendCharacterState(options: SendCharacterStateOptions): void;

  /**
   * Sends SET_CHARACTER_STATE packet to configure character physics, speed, gravity, punch range, and build range.
   */
  public sendCharacterState(
    targetOrPunchOrOptions?: Player | number | SendCharacterStateOptions,
    optionsOrEveryPeer?: Partial<CharacterData> | boolean,
  ): void {
    let targetPlayer = this.player;
    let overrides: Partial<CharacterData> = {};
    let everyPeer = false;
    let punchID: number | undefined;

    if (typeof targetOrPunchOrOptions === "number") {
      punchID = targetOrPunchOrOptions;
      everyPeer = typeof optionsOrEveryPeer === "boolean" ? optionsOrEveryPeer : true;
    } else if (targetOrPunchOrOptions && "peer" in targetOrPunchOrOptions) {
      targetPlayer = targetOrPunchOrOptions as Player;
      if (typeof optionsOrEveryPeer === "object") {
        overrides = optionsOrEveryPeer;
      }
      punchID = overrides.punchType ?? targetPlayer.getPunchID();
      everyPeer = false;
    } else if (typeof targetOrPunchOrOptions === "object" && targetOrPunchOrOptions !== null) {
      const opts = targetOrPunchOrOptions as SendCharacterStateOptions;
      targetPlayer = opts.targetPlayer ?? this.player;
      punchID = opts.punchID ?? opts.punchType ?? targetPlayer.getPunchID();
      everyPeer = opts.everyPeer ?? false;
      overrides = opts;
    } else {
      punchID = this.player.getPunchID();
      everyPeer = typeof optionsOrEveryPeer === "boolean" ? optionsOrEveryPeer : false;
    }

    const charData: CharacterData = {
      ...targetPlayer.charData,
      ...overrides,
    };

    if (punchID !== undefined) {
      charData.punchType = punchID;
    }

    const tank = GameUpdatePacket.from({
      type: TANK_PACKET_TYPE.SET_CHARACTER_STATE,
      objectType: charData.punchType,
      jumpCount: charData.buildRange,
      buildRange: charData.punchRange,
      netID: targetPlayer.netID,
      targetNetID: 0,
      flags: charData.char2State,
      float_var: charData.waterSpeed,
      itemID: charData.charState,
      posX: charData.speed,
      posY: charData.punchPower,
      speedX: charData.accel,
      speedY: charData.gravity,
      particleID: 0,
      tileX: 0,
      tileY: 0,
      extraDataLength: 0,
      extraData: [],
    });

    const data = tank.parse();
    if (!data) return;

    const packet = new Packet(data, PacketKind.Reliable);
    this.player.send(packet);

    if (everyPeer && this.player.world.current) {
      this.player.world.current.sendToAllPlayer(packet, this.player.id);
    }
  }
}
