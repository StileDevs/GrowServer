import "../src/game/index";
import { afterEach, expect, spyOn, test } from "bun:test";
import { runFastTick, runSlowTick, startServerTicks, stopServerTicks, FAST_TICK_MS, SLOW_TICK_MS } from "../src/game/server-tick";
import { serverManager } from "../src/game/server/server-manager";
import type { Player } from "../src/game/player";
import type { World } from "../src/game/world/world";
import { tickGeiger } from "../src/game/geiger/geiger-manager";
import { handleTankPacket } from "../src/game/network/tank-handler";
import { GameUpdatePacket } from "../src/game/packets/game-packet";
import { TANK_PACKET_TYPE } from "../src/constants";

test("movement emits geiger rings without waiting for the scheduler and shares its throttle", async () => {
  let pulses = 0;
  const player = {
    netID: 1, state: { x: 0, y: 0 },
    inventory: { clothes: { hand: 2204 } }, playMods: { has: () => false },
    geiger: { targetX: 400, targetY: 0, lastPulseAt: 0 },
    sendBuffer: () => { pulses++; },
    world: { syncMusic: () => {}, broadcast: () => {} },
  } as unknown as Player;
  const now = spyOn(Date, "now").mockReturnValue(10000);
  const packet = GameUpdatePacket.create({ type: TANK_PACKET_TYPE.STATE, posX: 100, posY: 0, tileX: 1 });
  try {
    await handleTankPacket(player, packet);
    expect(pulses).toBe(1);
    expect(player.state.x).toBe(100);
    tickGeiger(player);
    await handleTankPacket(player, packet);
    expect(pulses).toBe(1);
    now.mockReturnValue(11800);
    tickGeiger(player);
    expect(pulses).toBe(2);
  } finally { now.mockRestore(); }
});

test("geiger interval follows distance when approaching and retreating from the same target", () => {
  let pulses = 0;
  const player = {
    world: {} as World, inventory: { clothes: { hand: 2204 } }, playMods: { has: () => false },
    state: { x: 0, y: 0 }, geiger: { targetX: 900, targetY: 0, lastPulseAt: 10000 },
    sendBuffer: () => { pulses++; },
  } as unknown as Player;
  const now = spyOn(Date, "now").mockReturnValue(10600);
  try {
    tickGeiger(player);
    expect(pulses).toBe(0);
    player.state.x = 800;
    tickGeiger(player);
    expect(pulses).toBe(1);
    expect(player.geiger!.targetX).toBe(900);
    player.state.x = 0;
    now.mockReturnValue(10800);
    tickGeiger(player);
    expect(pulses).toBe(1);
    now.mockReturnValue(13600);
    tickGeiger(player);
    expect(pulses).toBe(2);
  } finally { now.mockRestore(); }
});

afterEach(() => {
  stopServerTicks();
  serverManager.players.delete("tick-test");
});

test.each([
  [900, 3000], [500, 2600], [400, 2200], [300, 1800],
  [201, 1404], [200, 1400], [199, 1392], [175, 1200], [150, 1000], [100, 600], [50, 200],
])("stationary geiger at %i pixels pulses every %i ms", (distance, interval) => {
  let pulses = 0;
  const player = {
    id: "tick-test", netID: 1, world: {} as World,
    inventory: { clothes: { hand: 2204 } },
    playMods: { has: () => false },
    state: { x: 0, y: 0 },
    geiger: { targetX: distance, targetY: 0, lastPulseAt: 0 },
    sendBuffer: () => { pulses++; },
  } as unknown as Player;
  serverManager.players.set(player.id, player);
  const now = spyOn(Date, "now").mockReturnValue(10000);
  try {
    runFastTick();
    expect(pulses).toBe(1);
    now.mockReturnValue(10000 + interval - 1);
    runFastTick();
    expect(pulses).toBe(1);
    now.mockReturnValue(10000 + interval);
    runFastTick();
    expect(pulses).toBe(2);
    player.world = undefined;
    now.mockReturnValue(10000 + interval * 2);
    runFastTick();
    expect(pulses).toBe(2);
  } finally {
    now.mockRestore();
  }
});

test("play mods run on the slow tick only", () => {
  let updates = 0;
  serverManager.players.set("tick-test", {
    playMods: { tick: () => { updates++; } },
  } as unknown as Player);
  runFastTick();
  expect(updates).toBe(0);
  runSlowTick();
  expect(updates).toBe(1);
});

test("upstream scheduler starts once, gates slow ticks, and skips missed ticks", () => {
  const intervals: number[] = [];
  let callback: () => void = () => {};
  let updates = 0;
  serverManager.players.set("tick-test", { playMods: { tick: () => { updates++; } } } as unknown as Player);
  const now = spyOn(Date, "now").mockReturnValue(10000);
  const interval = spyOn(globalThis, "setInterval").mockImplementation(((_callback: unknown, ms: number) => {
    callback = _callback as () => void;
    intervals.push(ms);
    return intervals.length;
  }) as typeof setInterval);
  const clear = spyOn(globalThis, "clearInterval").mockImplementation(() => {});
  try {
    startServerTicks();
    startServerTicks();
    expect(intervals).toEqual([FAST_TICK_MS]);
    callback();
    expect(updates).toBe(0);
    now.mockReturnValue(10000 + SLOW_TICK_MS);
    callback();
    expect(updates).toBe(1);
    now.mockReturnValue(20000);
    callback();
    expect(updates).toBe(2);
    callback();
    expect(updates).toBe(2);
    stopServerTicks();
    expect(clear).toHaveBeenCalledTimes(1);
    stopServerTicks();
    expect(clear).toHaveBeenCalledTimes(1);
    startServerTicks();
    expect(intervals).toEqual([250, 250]);
    stopServerTicks();
  } finally {
    interval.mockRestore();
    clear.mockRestore();
    now.mockRestore();
  }
});
