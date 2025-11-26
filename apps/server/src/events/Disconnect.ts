import { Base } from "../core/Base";
import { World } from "../core/World";
import { tileFrom, tileUpdateMultiple } from "../world/tiles";
import { TileFlags } from "@growserver/const";
import { HeartMonitorTile } from "../world/tiles/HeartMonitorTile";
import logger from "@growserver/logger";

export class DisconnectListener {
  constructor(public base: Base) {
    logger.info('Listening ENet "disconnect" event');
  }

  public run(netID: number): void {
    const peer = this.base.cache.peers.find((id) => id.netID == netID);
    if (peer && peer.heartMonitors) {
      peer.heartMonitors.forEach((indexes, worldName) => {
        const tiles = new Array<HeartMonitorTile>();
        const worldData = this.base.cache.worlds.get(worldName);

        if (!worldData || worldData.playerCount == 0) return;

        const world = new World(this.base, worldName);

        for (const index of indexes) {
          const heartMonitorTile = tileFrom(
            this.base,
            world,
            worldData.blocks[index],
          );

          tiles.push(heartMonitorTile as HeartMonitorTile);
        }

        tileUpdateMultiple(world, tiles);
      });
    }

    logger.info(`Peer ${netID} disconnected`);
    this.base.cache.peers.delete(netID);
  }
}
