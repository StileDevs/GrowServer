import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { registerCommand } from "./registry";

/**
 * Emote commands: each one plays an animation on the player's avatar for
 * everyone in the world (OnAction `/name`).
 */
const EMOTES: Array<{ name: string; description: string; aliases?: string[] }> = [
  { name: "cheer", description: "Cheer" },
  { name: "dab", description: "Dab" },
  { name: "dance", description: "Dance" },
  { name: "dance2", description: "Dance 2" },
  { name: "facepalm", description: "Facepalm" },
  { name: "foldarms", description: "Fold your arms" },
  { name: "furious", description: "Furious" },
  { name: "grumpy", description: "Grumpy" },
  { name: "love", description: "Love" },
  { name: "march", description: "March" },
  { name: "no", description: "No" },
  { name: "omg", description: "OMG" },
  { name: "rolleyes", description: "Roll your eyes" },
  { name: "sad", description: "Sad", aliases: ["cry"] },
  { name: "sassy", description: "Sassy" },
  { name: "shrug", description: "Shrug" },
  { name: "shy", description: "Shy" },
  { name: "sleep", description: "Sleep" },
  { name: "smh", description: "Shake your head" },
  { name: "troll", description: "Troll" },
  { name: "wave", description: "Wave" },
  { name: "wink", description: "Wink" },
  { name: "yes", description: "Yes" },
];

function playEmote(player: Player, name: string): void {
  const world = player.world;
  if (!world) return;
  world.broadcastVariant(Variant.from({ netID: player.netID }, "OnAction", `/${name}`));
}

for (const emote of EMOTES) {
  registerCommand({
    name: emote.name,
    description: emote.description,
    ...(emote.aliases ? { aliases: emote.aliases } : {}),
    cooldown: 1,
    execute: (player) => playEmote(player, emote.name),
  });
}
