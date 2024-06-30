import { Client, Constants, Message, type TextableChannel, type PossiblyUncachedTextableChannel } from "eris";
import { Command } from "../abstracts/Command.js";
import { BaseServer } from "../structures/BaseServer.js";
import test from "./DiscordCommands/test.js";
import ShutdownServer from "./DiscordCommands/ShutdownServer.js";
import { Logger } from "./Logger.js";

type Commands = Record<string, (srv: BaseServer, args: string[], msg: Message<TextableChannel>) => void>;

export class DiscordManager {
  private client: Client;
  private token: string;
  private clientId: string;
  private commands: Map<string, Command>;
  private server: BaseServer;
  private prefix: string;
  private log: Logger;

  constructor(token: string, clientId: string, server: BaseServer) {
    this.token = token;
    this.client = new Client(`Bot ${this.token}`, {
      intents: ["guilds", "guildMessages", 1 << 15], // 1 << 15 = MessageContent
      maxShards: "auto",
      messageLimit: 0,
      getAllUsers: false,
      allowedMentions: {
        everyone: false,
        roles: true,
        users: true
      },
      disableEvents: {
        TYPING_START: true,
        VOICE_STATE_UPDATE: true
      }
    });
    this.clientId = clientId;
    this.commands = new Map();
    this.server = server;
    this.prefix = ".";
    this.log = new Logger();

    this.client.on("ready", () => {
      this.log.discord("Discord Bot is Ready~");
      this.client.editStatus("online", { name: `GrowServer!`, type: Constants.ActivityTypes.WATCHING });
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
          commands[command](this.server, args, msg as Message<TextableChannel>);
        }
      }
    });
  }

  public async start() {
    try {
      this.log.info("Connecting Discord bot...");
      await this.client.connect();
    } catch (e) {
      if (e instanceof Error) {
        this.log.error("Failed connect because:", e.message);
        this.log.error("Skipping using discord bot");
      }
    }
  }
}
