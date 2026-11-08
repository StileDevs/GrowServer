import { PLAYER_ROLE } from "../constants";
import { PlayerDB } from "../database/services/player-db";
import { Variant } from "../game/packets/variants";
import { serverManager } from "../game/server/server-manager";
import { worldManager } from "../game/world/world-manager";
import { logger } from "../utils/logger";
import { serverConsole } from "./console";

const ROLE_BY_NAME: Record<string, PLAYER_ROLE> = {
  basic: PLAYER_ROLE.BASIC,
  developer: PLAYER_ROLE.DEVELOPER,
  dev: PLAYER_ROLE.DEVELOPER,
  moderator: PLAYER_ROLE.MODERATOR,
  mod: PLAYER_ROLE.MODERATOR,
  supporter: PLAYER_ROLE.SUPPORTER,
};

/**
 * Registers the operator console commands that act on the running game:
 * player listing, role management, broadcasts and saving.
 */
export function registerGameConsoleCommands(): void {
  serverConsole.registerCommand({
    name: "list",
    description: "Lists connected players and loaded worlds",
    usage: "list",
    execute: () => {
      const players = serverManager.players.map((player) => `${player.tankIDName || "(logging in)"}@${player.currentWorld || "menu"}`);
      const worlds = worldManager.worlds.map((world) => `${world.name}(${world.players.length})`);
      logger.info({ players, worlds }, "online players and loaded worlds");
    },
  });

  serverConsole.registerCommand({
    name: "role",
    description: "Sets a player's role (basic, supporter, moderator, developer)",
    usage: "role <growid> <role>",
    execute: async (args) => {
      const [name, roleName] = args;
      const role = roleName ? ROLE_BY_NAME[roleName.toLowerCase()] : undefined;
      if (!name || role === undefined) {
        logger.warn("usage: role <growid> <basic|supporter|moderator|developer>");
        return;
      }

      const record = await PlayerDB.getByName(name);
      if (!record) {
        logger.warn({ name }, "player not found");
        return;
      }

      await PlayerDB.updateById(record.id, { role_id: role });
      const online = serverManager.players.find((player) => player.playerId === record.id);
      if (online) {
        online.role = role;
        online.variants.sendOnConsoleMessage(`\`2Your role has been changed to \`o${PLAYER_ROLE[role]}\`2 by the server operator.\`\``);
        online.sendCountryState();
      }
      logger.info({ name: record.name, role: PLAYER_ROLE[role] }, "player role updated");
    },
  });

  serverConsole.registerCommand({
    name: "say",
    aliases: ["sb"],
    description: "Broadcasts a message to every connected player",
    usage: "say <message>",
    execute: (args) => {
      const message = args.join(" ").trim();
      if (!message) {
        logger.warn("usage: say <message>");
        return;
      }
      serverManager.broadcast(Variant.from("OnConsoleMessage", `CP:0_PL:4_OID:_CT:[SB]_ \`5**\`\` from \`$\`2Server\`\` ** :\`\` \`#${message}`).parsePacket());
      for (const player of serverManager.players.values()) player.sendSfx("audio/beep.wav");
    },
  });

  serverConsole.registerCommand({
    name: "save",
    description: "Saves every player and world to disk now",
    usage: "save",
    execute: async () => {
      for (const player of serverManager.players.values()) await player.saveToDatabase();
      await worldManager.saveAll();
      logger.info({ players: serverManager.players.size, worlds: worldManager.worlds.size }, "players and worlds saved");
    },
  });
}
