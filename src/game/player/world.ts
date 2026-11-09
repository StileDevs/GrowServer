import { Packet, PacketKind } from "growtopia.wasm";
import { TANK_PACKET_FLAGS, TANK_PACKET_TYPE } from "../../constants";
import { Color } from "../../utils/color";
import { logger } from "../../utils/logger";
import { GameUpdatePacket } from "../packets/game-packet";
import { Variant } from "../packets/variants";
import { worldManager } from "../world/world-manager";
import type { World } from "../world/world";
import type { Player } from "./index";

/**
 * Handles world transitions, spawning, and tile interactions for a specific Player.
 */
export class PlayerWorld {
  private isTransitioning = false;
  public current: World | null = null;

  constructor(private player: Player) {}

  /**
   * The name of the world the player is currently inside, or empty string.
   */
  public get name(): string {
    return this.current?.name ?? "";
  }

  /**
   * Whether the player is currently inside a world.
   */
  public get isInside(): boolean {
    return this.current !== null;
  }

  /**
   * Transitions the player into a target world.
   * @param worldName The name of the world to join.
   * @param doorId Optional target door label to spawn at.
   */
  public async join(worldName: string, doorId = ""): Promise<boolean> {
    if (this.isTransitioning) {
      logger.warn({ player: this.player.id, worldName }, "join request rejected: player is transitioning");
      return false;
    }

    this.isTransitioning = true;

    try {
      const cleanName = worldName.trim().toUpperCase();

      // Handling exit / empty world requests
      if (!cleanName || cleanName === "EXIT") {
        await this.leave();
        this.player.variants.sendOnRequestWorldSelectMenu();
        return true;
      }

      // World name validation
      if (!/^[A-Z0-9]{1,24}$/.test(cleanName)) {
        this.player.variants.sendOnConsoleMessage("`4Invalid world name. Only letters and numbers allowed.``");
        return false;
      }

      // Leave previous world if still inside one
      if (this.current) {
        await this.leave();
      }

      // Fetch or generate the world via WorldManager
      const world = await worldManager.getOrCreateWorld(cleanName);

      // 1. Send World MAP_DATA
      const mapBuffer = world.serialize();
      const mapPacket = GameUpdatePacket.from({
        type: TANK_PACKET_TYPE.SEND_MAP_DATA,
        objectType: 0,
        jumpCount: 0,
        buildRange: 0,
        netID: 0,
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
        extraDataLength: mapBuffer.length,
        extraData: Array.from(mapBuffer),
      }).parse()!;

      this.player.send(new Packet(mapPacket, PacketKind.Reliable));
      this.player.variants.sendOnSetCurrentWeather(world.weather);
      this.player.inventory.sendInventory();

      // 2. Determine spawn coordinates
      const spawnTile = doorId ? (world.tiles.findDoor(doorId) ?? world.tiles.findMainDoor()) : world.tiles.findMainDoor();

      const tileX = spawnTile ? spawnTile.x : 20;
      const tileY = spawnTile ? spawnTile.y : 23;
      const pixelX = tileX * 32;
      const pixelY = tileY * 32;

      // Update player state
      this.player.state.x = pixelX;
      this.player.state.y = pixelY;
      this.player.state.world.name = world.name;
      this.current = world;

      // 3. Register player inside world
      world.addPlayer(this.player);

      // 4. Welcome message for joining player
      this.player.variants.sendOnConsoleMessage(`\`oWorld \`w${world.name}\`\` \`oentered. There are \`w${world.playerCount - 1}\`\` other people here.\`\``);

      // 5. Sync other players currently in the world first (per proxy.log)
      world.syncOtherPlayersFor(this.player);

      // 6. Spawn local player avatar last
      this.player.variants.sendOnSpawn({
        spawnType: "avatar",
        netID: this.player.netID,
        userID: this.player.playerId,
        x: pixelX,
        y: pixelY,
        displayName: this.player.displayName || this.player.tankIDName,
        country: "us",
        type: "local",
      });

      // 7. Send position and sound per proxy.log
      this.player.variants.sendOnSetPos(this.player.netID, pixelX, pixelY);
      this.player.variants.sendOnPlayPositioned(this.player.netID, "audio/door_open.wav");
      this.player.action.playSFX("audio/dialog_confirm.wav", 0);

      // 8. Send clothes and character physics state for local player
      this.player.gamePacket.sendCharacterState();
      this.player.variants.sendClothes(this.player.netID, this.player.inventory.clothes, new Color(180, 138, 120, 255));

      // 9. Broadcast new player's join to other players in the world
      world.broadcastPlayerJoin(this.player, pixelX, pixelY);

      return true;
    } catch (err) {
      logger.error({ err, player: this.player.id, worldName }, "error while player joining world");
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Leaves the current world and notifies other players.
   */
  public async leave(): Promise<void> {
    if (!this.current) return;

    const previousWorld = this.current;
    this.current = null;
    this.player.state.world.name = "";

    previousWorld.removePlayer(this.player);
  }

  /**
   * Respawns the player at the world's main entrance door.
   */
  public respawn(): void {
    if (!this.current) return;

    const mainDoor = this.current.tiles.findMainDoor();
    const tileX = mainDoor ? mainDoor.x : 20;
    const tileY = mainDoor ? mainDoor.y : 23;
    const pixelX = tileX * 32;
    const pixelY = tileY * 32;

    this.player.state.x = pixelX;
    this.player.state.y = pixelY;

    // Send OnSetPos variant packet
    this.player.variants.sendOnSetPos(this.player.netID, pixelX, pixelY);
  }
}
