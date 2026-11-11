import { describe, expect, test } from "bun:test";
import { GameUpdatePacket } from "../src/game/packets/game-packet";
import { tickGeiger, rollGeigerReward } from "../src/game/geiger/geiger-manager";

test("normal geiger rewards respect explicit rarity weights", () => {
  const counts: Record<number, number> = {};
  for (let i = 0; i < 1235; i++) {
    const id = rollGeigerReward(() => (i + 0.5) / 1235);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  expect(counts[6416]).toBe(100);
  expect(counts[2244]).toBe(10);
  expect(counts[2248]).toBe(2);
  expect(counts[2250]).toBe(1);
  expect(counts[12502]).toBe(1);
});
import type { Player } from "../src/game/player";
import type { World } from "../src/game/world/world";

const TILE_PX = 32;

interface FakePlayer {
  world: World | null;
  netID: number;
  state: { x: number; y: number };
  inventory: { clothes: { hand: number } };
  playMods: { has: (id: string) => boolean };
  geiger: Player["geiger"];
  sent: Buffer[];
  sendBuffer: (buffer: Buffer) => void;
}

function fakePlayer(): FakePlayer {
  const player: FakePlayer = {
    world: { width: 100, height: 100 } as World,
    netID: 1,
    state: { x: 0, y: 0 },
    inventory: { clothes: { hand: 2204 } },
    playMods: { has: () => false },
    geiger: { targetX: 10_000, targetY: 10_000, lastPulseAt: 0 },
    sent: [],
    sendBuffer(buffer: Buffer) {
      player.sent.push(buffer);
    },
  };
  return player;
}

const asPlayer = (player: FakePlayer): Player => player as unknown as Player;

/** Decodes the ring color carried by particle 114's `speedX`. */
function lastRing(player: FakePlayer): number | null {
  const buffer = player.sent.at(-1);
  if (!buffer) return null;
  return GameUpdatePacket.fromBuffer(buffer.subarray(4)).data.speedX;
}

/** Places the target on the same row, `blocks` away. */
function targetBlocksAway(player: FakePlayer, blocks: number): void {
  player.geiger = { targetX: blocks * TILE_PX, targetY: 0, lastPulseAt: 0 };
}

describe("geiger signal bands", () => {
  test("emits no rings beyond 30 blocks", () => {
    const player = fakePlayer();
    targetBlocksAway(player, 31);

    tickGeiger(asPlayer(player), 1_000);

    expect(player.sent).toHaveLength(0);
  });

  test("red rings between 15 and 30 blocks", () => {
    const player = fakePlayer();
    targetBlocksAway(player, 30);

    tickGeiger(asPlayer(player), 1_000);

    expect(lastRing(player)).toBe(0);
  });

  test("yellow rings between 7.5 and 15 blocks", () => {
    const player = fakePlayer();
    targetBlocksAway(player, 15);

    tickGeiger(asPlayer(player), 1_000);

    expect(lastRing(player)).toBe(1);
  });

  test("green rings between 4 and 7.5 blocks", () => {
    const player = fakePlayer();
    targetBlocksAway(player, 7.5);

    tickGeiger(asPlayer(player), 1_000);

    expect(lastRing(player)).toBe(2);
  });

  test("green pulses accelerate with proximity inside 4 blocks", () => {
    const player = fakePlayer();
    targetBlocksAway(player, 4);

    tickGeiger(asPlayer(player), 1_000);
    expect(lastRing(player)).toBe(2);

    // Four blocks is still outside the fastest close-range pulse.
    tickGeiger(asPlayer(player), 1_250);
    expect(player.sent).toHaveLength(1);

    tickGeiger(asPlayer(player), 1_824);
    expect(player.sent).toHaveLength(2);
  });

  test("normal bands use the distance-adaptive interval", () => {
    const player = fakePlayer();
    targetBlocksAway(player, 10);

    tickGeiger(asPlayer(player), 1_000);
    tickGeiger(asPlayer(player), 1_250);
    expect(player.sent).toHaveLength(1);

    tickGeiger(asPlayer(player), 2_880);
    expect(player.sent).toHaveLength(2);
  });
});

describe("geiger game tick", () => {
  test("pulses while idle and throttles to the pulse interval", () => {
    const player = fakePlayer();
    targetBlocksAway(player, 20);

    tickGeiger(asPlayer(player), 1_000);
    expect(player.sent).toHaveLength(1);

    tickGeiger(asPlayer(player), 1_100);
    expect(player.sent).toHaveLength(1);

    tickGeiger(asPlayer(player), 4_000);
    expect(player.sent).toHaveLength(2);
  });

  test("clears the hunt when the counter leaves the hand", () => {
    const player = fakePlayer();
    targetBlocksAway(player, 20);
    tickGeiger(asPlayer(player), 1_000);

    player.inventory.clothes.hand = 0;
    tickGeiger(asPlayer(player), 1_700);

    expect(player.geiger).toBeNull();
    expect(player.sent).toHaveLength(1);
  });

  test("clears the hunt when the player leaves the world", () => {
    const player = fakePlayer();
    player.world = null;

    tickGeiger(asPlayer(player), 1_000);

    expect(player.geiger).toBeNull();
    expect(player.sent).toHaveLength(0);
  });

  test("starts a hunt lazily when the counter is held but no session exists", () => {
    const player = fakePlayer();
    player.geiger = null;

    tickGeiger(asPlayer(player), 1_000);

    expect(player.geiger).not.toBeNull();
  });

  test("sends nothing while irradiated but keeps the session", () => {
    const player = fakePlayer();
    player.playMods.has = (id: string) => id === "irradiated";

    tickGeiger(asPlayer(player), 1_000);

    expect(player.geiger).not.toBeNull();
    expect(player.sent).toHaveLength(0);
  });
});
