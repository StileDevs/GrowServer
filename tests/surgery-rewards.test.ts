import "../src/game/index";
import { expect, test, spyOn } from "bun:test";
import { rollSurgeryPrizes } from "../src/game/surgery/surgery-rewards";
import { SURGERY_LOOT_BASE, CADUCEUS_ID } from "../src/game/quests/constants";
import { dialogs } from "../src/game/network/dialog-handler";
import { TextParser } from "../src/utils/text-parser";
import type { Player } from "../src/game/player";
import type { World } from "../src/game/world/world";
import { tickCooking } from "../src/game/cooking/cooking-manager";
import { OVEN_HEAT } from "../src/game/cooking/cooking-constants";

test.each([[1258, 5], [1290, 10], [1256, 1]])("surgery prize %i uses quantity %i", (id, amount) => {
  let first = true;
  const random = () => {
    if (first) { first = false; return (SURGERY_LOOT_BASE.indexOf(id) + 0.5) / SURGERY_LOOT_BASE.length; }
    return 0.99;
  };
  expect(rollSurgeryPrizes(-1, false, random)).toEqual([{ id, amount }]);
});

test("jackpot replaces the base prize", () => {
  const rolls = [0.5, 0.99, 0, 0, 0.99];
  expect(rollSurgeryPrizes(-1, false, () => rolls.shift()!)).toEqual([{ id: 8284, amount: 1 }]);
});

test("Sunday can award its exclusive prize", () => {
  const rolls = [0.5, 0, 0, 0.99, 0.99, 0.99];
  expect(rollSurgeryPrizes(-1, true, () => rolls.shift()!)).toEqual([{ id: 4334, amount: 1 }]);
});

test("forged drop return cannot remove or drop Caduceus", async () => {
  let message = "";
  const player = { sendTextBubble: (text: string) => { message = text; } } as Player;
  await dialogs.get("drop_end")!(player, new TextParser(`itemID|${CADUCEUS_ID}\ndrop_count|1`));
  expect(message).toBe("Caduceus cannot be dropped.");
});

test.each([15, 35, 125])("cooking ingredient age %i does not emit state notifications", (age) => {
  const now = spyOn(Date, "now").mockReturnValue(1000000);
  const oven = {
    tempLevel: OVEN_HEAT.LOW, startedAt: 1000000 - age * 1000, lastTickSec: age - 1,
    ingredients: [{ itemId: 4612, timeAddedMs: 0 }], chefPlayerId: 1,
  };
  // A state notification would call a missing method on this chef/world and fail.
  const world = { players: [{ playerId: 1 }], data: { blocks: [{ x: 1, y: 1, oven }] } } as unknown as World;
  try {
    tickCooking(world);
    expect(oven.lastTickSec).toBe(age);
  } finally { now.mockRestore(); }
});
