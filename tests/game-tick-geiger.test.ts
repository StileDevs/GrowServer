import { describe, expect, test } from "bun:test";
import { tickGeiger } from "../src/game/geiger/geiger-manager";
import type { Player } from "../src/game/player";
import type { World } from "../src/game/world/world";

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
    geiger: { targetX: 10_000, targetY: 10_000, nextPulseAt: 0 },
    sent: [],
    sendBuffer(buffer: Buffer) {
      player.sent.push(buffer);
    },
  };
  return player;
}

const asPlayer = (player: FakePlayer): Player => player as unknown as Player;

describe("geiger game tick", () => {
  test("pulses while idle and throttles to the pulse interval", () => {
    const player = fakePlayer();

    tickGeiger(asPlayer(player), 1_000);
    expect(player.sent).toHaveLength(1);

    tickGeiger(asPlayer(player), 1_100);
    expect(player.sent).toHaveLength(1);

    tickGeiger(asPlayer(player), 1_700);
    expect(player.sent).toHaveLength(2);
  });

  test("clears the hunt when the counter leaves the hand", () => {
    const player = fakePlayer();
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
    expect(player.sent).toHaveLength(1);
  });

  test("sends nothing while irradiated but keeps the session", () => {
    const player = fakePlayer();
    player.playMods.has = (id: string) => id === "irradiated";

    tickGeiger(asPlayer(player), 1_000);

    expect(player.geiger).not.toBeNull();
    expect(player.sent).toHaveLength(0);
  });
});
