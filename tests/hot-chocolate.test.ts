import "../src/game/index";
import { expect, test } from "bun:test";
import type { ItemDefinition } from "grow-items";
import { useConsumable } from "../src/game/item/consumables";
import { PlayModController } from "../src/game/player/play-mod-controller";
import type { Player } from "../src/game/player";
import type { World } from "../src/game/world/world";

test.each([true, false])("hot chocolate clears irradiation and consumes one drink (irradiated: %s)", async (irradiated) => {
  let drinks = 2;
  const player = {
    netID: 0, state: { x: 0, y: 0 }, inventory: { hasItem: () => drinks > 0 },
    variants: { sendOnConsoleMessage: () => {}, sendOnTalkBubble: () => {} },
    removeItemInven: () => { drinks--; return 1; }, addXp: () => {},
  } as unknown as Player;
  player.playMods = new PlayModController(player);
  if (irradiated) player.playMods.add("irradiated");
  player.playMods.add("lucky");
  const world = {
    players: [player], sendItemEffect: () => {}, playPositioned: () => {},
  } as unknown as World;
  await useConsumable(player, world, { id: 3240 } as ItemDefinition, 0, 0);
  expect(drinks).toBe(1);
  expect(player.playMods.has("irradiated")).toBe(false);
  expect(player.playMods.has("lucky")).toBe(true);
});
