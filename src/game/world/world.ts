import { Packet, PacketKind } from "growtopia.wasm";
import { Collection } from "../../utils/collection";
import { Color } from "../../utils/color";
import { ExtendBuffer } from "../../utils/extend-buffer";
import { logger } from "../../utils/logger";
import type { Player } from "../player";
import { WorldObject } from "./world-object";
import { WorldTiles } from "./world-tiles";

export interface WorldOptions {
  name: string;
  width?: number;
  height?: number;
  version?: number;
  weather?: number;
}

/**
 * Represents an active game world in memory.
 */
export class World {
  public name: string;
  public width: number;
  public height: number;
  public version: number;
  public weather: number;

  public tiles: WorldTiles;
  public players: Collection<string, Player> = new Collection();
  public objects: Collection<number, WorldObject> = new Collection();
  public dropIdCounter = 0;

  constructor(options: WorldOptions) {
    this.name = options.name.trim().toUpperCase();
    this.width = Math.max(1, Math.min(255, Math.floor(options.width ?? 100)));
    this.height = Math.max(1, Math.min(255, Math.floor(options.height ?? 60)));
    this.version = options.version ?? 17;
    this.weather = options.weather ?? 41;
    this.tiles = new WorldTiles(this.width, this.height);
  }

  /**
   * Total number of connected players in this world.
   */
  public get playerCount(): number {
    return this.players.size;
  }

  /**
   * Sends a packet, buffer, or executes a callback for all players in this world.
   * @param actionOrPacket Callback function, Packet, or raw Buffer to send
   * @param ignorePlayerId Optional player ID to exclude from the broadcast
   */
  public sendToAllPlayer(actionOrPacket: ((player: Player) => void) | Packet | Buffer, ignorePlayerId?: string): void {
    for (const player of this.players.values()) {
      if (ignorePlayerId && player.id === ignorePlayerId) continue;

      if (typeof actionOrPacket === "function") {
        actionOrPacket(player);
      } else if (actionOrPacket instanceof Packet) {
        player.send(actionOrPacket);
      } else {
        player.send(new Packet(actionOrPacket, PacketKind.Reliable));
      }
    }
  }

  /**
   * Broadcasts a packet to all connected players in this world.
   */
  public broadcast(packet: Packet, ignorePlayerId?: string): void {
    this.sendToAllPlayer(packet, ignorePlayerId);
  }

  /**
   * Sends all other existing players in this world to a specific player.
   */
  public syncOtherPlayersFor(player: Player): void {
    for (const other of this.players.values()) {
      if (other.id === player.id) continue;
      if (player.playerId > 0 && other.playerId === player.playerId) continue;
      if (player.username && other.username && other.username === player.username) continue;
      if (player.tankIDName && other.tankIDName && other.tankIDName.toLowerCase() === player.tankIDName.toLowerCase()) continue;

      player.variants.sendOnSpawn({
        spawnType: "avatar",
        netID: other.netID,
        userID: other.playerId,
        x: other.state.x,
        y: other.state.y,
        displayName: other.displayName || other.tankIDName,
        country: "us",
      });

      player.gamePacket.sendCharacterState(other);
      player.variants.sendClothes(other.netID, other.inventory.clothes, new Color(180, 138, 120, 255));
    }
  }

  /**
   * Broadcasts a newly joined player's avatar, clothing, notification message,
   * talk bubble, and door SFX to all other players in the world.
   */
  public broadcastPlayerJoin(player: Player, pixelX: number, pixelY: number): void {
    const joinMsg = `\`5<${player.displayName || player.tankIDName}>\`\` joined, \`w${this.playerCount}\`\` others here\`5>\`\``;

    this.sendToAllPlayer((other) => {
      if (other.id === player.id) return;
      if (player.playerId > 0 && other.playerId === player.playerId) return;
      if (player.username && other.username && other.username === player.username) return;
      if (player.tankIDName && other.tankIDName && other.tankIDName.toLowerCase() === player.tankIDName.toLowerCase()) return;

      other.variants.sendOnSpawn({
        spawnType: "avatar",
        netID: player.netID,
        userID: player.playerId,
        x: pixelX,
        y: pixelY,
        displayName: player.displayName || player.tankIDName,
        country: "us",
      });

      other.variants.sendClothes(player.netID, player.inventory.clothes, new Color(180, 138, 120, 255));

      other.gamePacket.sendCharacterState(player);

      other.variants.sendOnConsoleMessage(joinMsg);
      other.variants.sendOnTalkBubble(player.netID, joinMsg, 0, 1);
      other.action.playSFX("audio/door_open.wav", 0);
    }, player.id);
  }

  /**
   * Adds a player to this world's active player list.
   */
  public addPlayer(player: Player): void {
    // Remove any stale player instances with the same playerId, tankIDName, or netID
    for (const [id, existing] of this.players.entries()) {
      if (existing.id === player.id) continue;
      const isSamePlayerId = player.playerId > 0 && existing.playerId === player.playerId;
      const isSameName = Boolean(
        (player.username && existing.username && player.username === existing.username) ||
        (player.tankIDName && existing.tankIDName && existing.tankIDName.toLowerCase() === player.tankIDName.toLowerCase()),
      );
      const isSameNetId = existing.netID === player.netID;

      if (isSamePlayerId || isSameName || isSameNetId) {
        this.players.delete(id);
        player.variants.sendOnRemove(existing.netID);
      }
    }

    this.players.set(player.id, player);
    logger.info({ world: this.name, playerId: player.playerId, totalPlayers: this.players.size }, "player entered world");
  }

  /**
   * Removes a player from this world's active player list and notifies remaining players.
   */
  public removePlayer(player: Player): void {
    if (!this.players.has(player.id)) return;

    this.players.delete(player.id);

    // Notify all remaining players in the world
    for (const otherPlayer of this.players.values()) {
      otherPlayer.variants.sendOnRemove(player.netID);
    }

    logger.info({ world: this.name, playerId: player.playerId, totalPlayers: this.players.size }, "player left world");
  }

  /**
   * Serializes the world into a binary buffer matching Growtopia's MAP_DATA format.
   */
  public serialize(): Buffer {
    const estimatedSize = 100 + this.name.length + this.width * this.height * 12 + this.objects.size * 16 + 50;
    const buf = new ExtendBuffer(estimatedSize);

    // Header (20 bytes + name length)
    buf.writeU16(0x17); // Version / Type byte 0x14 (20) dan 0x17 (23)
    buf.writeU32(0x40); // Flags (64)
    buf.writeString(this.name, 2);
    buf.writeU32(this.width);
    buf.writeU32(this.height);
    buf.writeU32(this.tiles.count);

    // unk1: 5 bytes padding
    buf.writeBytes(new Uint8Array(5));

    // Tiles (sequential blocks)
    this.tiles.serialize(buf);

    // unk2: 12 bytes padding
    buf.writeBytes(new Uint8Array(12));

    // Dropped Objects (8 bytes header + count * 16 bytes)
    buf.writeU32(this.objects.size);
    buf.writeU32(this.dropIdCounter);
    for (const obj of this.objects.values()) {
      obj.serialize(buf);
    }

    // Weather (12 bytes)
    buf.writeU16(this.weather);
    const weatherOnOff = this.weather === 41 ? 0x0 : 0x1;
    buf.writeU16(weatherOnOff);
    buf.writeU32(0x0);
    buf.writeU32(0x0);

    return buf.toBuffer();
  }

  /**
   * Deserializes a binary buffer into this world's state.
   */
  public deserialize(buffer: Buffer): void {
    const buf = new ExtendBuffer(Array.from(buffer));

    // Header
    this.version = buf.readU16();
    const flags = buf.readU32();
    this.name = buf.readString(2);
    this.width = buf.readU32();
    this.height = buf.readU32();
    const tileCount = buf.readU32();

    // unk1: 5 bytes padding
    buf.readBytes(5);

    // Tiles
    this.tiles = new WorldTiles(this.width, this.height);
    this.tiles.deserialize(buf, tileCount);

    // unk2: 12 bytes padding
    buf.readBytes(12);

    // Dropped Objects
    const objectCount = buf.readU32();
    this.dropIdCounter = buf.readU32();
    this.objects.clear();
    for (let i = 0; i < objectCount; i++) {
      const obj = WorldObject.deserialize(buf);
      this.objects.set(obj.id, obj);
    }

    // Weather
    this.weather = buf.readU16();
    const weatherOnOff = buf.readU16();
    buf.readU32();
    buf.readU32();
  }
}
