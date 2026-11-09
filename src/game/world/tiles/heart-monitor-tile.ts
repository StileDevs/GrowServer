import type { ItemDefinition } from "grow-items";
import type { ExtendBuffer } from "../../../utils/extend-buffer";
import { Collection } from "../../../utils/collection";
import { logger } from "../../../utils/logger";
import { PlayerDB } from "../../../database/services/player-db";
import type { Player } from "../../player";
import { serverManager } from "../../server/server-manager";
import { Tile } from "../tile";
import { TileExtraTypes, TileFlags } from "../constants";

/**
 * Display names of heart monitor owners by database player id.
 * `TileData.heartMonitor` only stores the id and `serialize` is synchronous,
 * so names are cached here and fetched from the database on first use.
 */
const ownerNames: Collection<number, string> = new Collection();
/** Player ids whose name is being looked up right now. */
const pendingLookups = new Set<number>();

/**
 * Heart monitors. Extra data: u8 extra type, u32 owner player id, string owner name.
 * The tile's OPEN flag is set while the owner is connected to any game server,
 * which is what makes the client draw the monitor as beating.
 */
export class HeartMonitorTile extends Tile {
  public extraType = TileExtraTypes.HEART_MONITOR;

  public override async onPlaceForeground(player: Player, itemMeta: ItemDefinition): Promise<boolean> {
    if (!(await super.onPlaceForeground(player, itemMeta))) return false;

    this.data.flags |= TileFlags.TILEEXTRA;
    this.data.heartMonitor = { playerId: player.playerId, name: player.displayName };
    ownerNames.set(player.playerId, player.displayName);

    // the place packet carries no extra data: send the owner right away
    this.tileUpdate();
    return true;
  }

  public override async onDestroy(player: Player): Promise<void> {
    await super.onDestroy(player);
    delete this.data.heartMonitor;
  }

  public override serializedFlags(flags: number): number {
    flags = (flags | TileFlags.TILEEXTRA) & ~TileFlags.OPEN;
    return this.onlineOwner() ? flags | TileFlags.OPEN : flags;
  }

  public override serialize(buffer: ExtendBuffer): void {
    const playerId = this.data.heartMonitor?.playerId ?? 0;
    buffer.writeU8(this.extraType);
    buffer.writeU32(playerId);
    buffer.writeString(this.ownerName());
  }

  /** The owner's connected `Player`, if they are online on any game server. */
  private onlineOwner(): Player | undefined {
    const playerId = this.data.heartMonitor?.playerId;
    if (playerId === undefined) return undefined;
    return serverManager.players.find((other) => other.playerId === playerId);
  }

  /**
   * Owner display name: from the connected player, the cache, or "" while a
   * database lookup runs (the tile is re-sent once the name is known).
   */
  private ownerName(): string {
    const playerId = this.data.heartMonitor?.playerId;
    if (playerId === undefined) return "";

    const online = this.onlineOwner();
    if (online) {
      ownerNames.set(playerId, online.displayName);
      return online.displayName;
    }

    const cached = ownerNames.get(playerId) ?? this.data.heartMonitor?.name;
    if (cached !== undefined) return cached;

    // monitors placed before the name was stored with the tile
    this.fetchOwnerName(playerId);
    return "";
  }

  private fetchOwnerName(playerId: number): void {
    if (pendingLookups.has(playerId)) return;
    pendingLookups.add(playerId);

    PlayerDB.getById(playerId)
      .then((record) => {
        // cache misses too, so a deleted owner is not looked up on every serialize
        ownerNames.set(playerId, record?.display_name || record?.name || "");
        if (record && this.data.heartMonitor?.playerId === playerId) this.tileUpdate();
      })
      .catch((err: unknown) => {
        logger.warn({ err, playerId }, "failed to resolve heart monitor owner name");
      })
      .finally(() => pendingLookups.delete(playerId));
  }
}
