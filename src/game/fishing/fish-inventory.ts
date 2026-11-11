import type { Player } from "../player";
import type { World } from "../world/world";

/** Restores a fish's full weight even when the backpack stack has limited room. */
export function returnFishOrDrop(player: Player, world: World, fishId: number, weight: number, tileX: number, tileY: number): void {
  if (fishId <= 0 || !Number.isSafeInteger(weight) || weight <= 0) return;
  const added = player.addItemInven(fishId, weight);
  if (added < weight) {
    world.drop(player, tileX * 32 + 8, tileY * 32 + 8, fishId, weight - added, { noSimilar: true });
  }
}
