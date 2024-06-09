import { Client, GatewayIntentBits, Message, ActivityType, PresenceUpdateStatus } from "discord.js";
import { Command } from "../abstracts/Command.js";
import { BaseServer } from "../structures/BaseServer.js";
import test from "./DiscordCommands/test.js";
import ShutdownServer from "./DiscordCommands/ShutdownServer.js";
import { Logger } from "./Logger.js";

type Commands = {
  [key: string]: (srv: BaseServer, args: string[], msg: Message) => void;
};

export class DiscordManager {
  private client: Client;
  private token: string;
  private clientId: string;
  private commands: Map<string, Command>;
  private server: BaseServer;
  private prefix: string;
  private log: Logger;

  constructor(token: string, clientId: string, server: BaseServer) {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
    this.token = token;
    this.clientId = clientId;
    this.commands = new Map();
    this.server = server;
    this.prefix = ".";
    this.log = new Logger();

    this.client.on("ready", () => {
      this.log.discord("Discord Bot is Ready~");
      this.client.user?.setPresence({
        activities: [
          {
            name: `GrowServer!`,
            type: ActivityType.Watching
          }
        ],
        status: PresenceUpdateStatus.DoNotDisturb
      });
    });

    this.client.on("messageCreate", async (msg) => {
      const message = msg.content;
      const args = message.split(" ");
      let command = args[0];
      args.shift();

      const commands: Commands = {
        test,
        shutdown: ShutdownServer
      };

      if (command.startsWith(this.prefix)) {
        command = command.replace(this.prefix, "");
        if (commands[command]) {
          commands[command](this.server, args, msg);
        }
      }
    });
  }

  public async start() {
    try {
      this.log.info("Connecting Discord bot...");
      await this.client.login(this.token);
    } catch (e) {
      if (e instanceof Error) {
        this.log.error("Failed connect because:", e.message);
        this.log.error("Skipping using discord bot");
      }
    }
  }
}
