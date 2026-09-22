import readline from "node:readline";
import { Collection } from "../utils/collection";
import { logger, setActiveReadline } from "../utils/logger";

/**
 * Definition for an interactive server console command.
 */
export interface ConsoleCommand {
  /** The command identifier name (e.g. "ping") */
  name: string;
  /** Human-readable explanation of what the command does */
  description: string;
  /** Optional usage string explaining arguments syntax */
  usage?: string;
  /** Optional alternative command aliases */
  aliases?: string[];
  /** Handler invoked when the console command is executed */
  execute(args: string[]): Promise<void> | void;
}

/**
 * Interactive command-line console interface for GrowServer, mirroring the Minecraft server console.
 */
export class ServerConsole {
  private static instance: ServerConsole;
  private rl: readline.Interface | null = null;
  private isRunning = false;

  /** Registered console commands collection */
  public commands: Collection<string, ConsoleCommand> = new Collection();
  /** Registry mapping command aliases to canonical names */
  private aliases: Collection<string, string> = new Collection();

  private constructor() {
    this.registerDefaultCommands();
  }

  /**
   * Returns the singleton instance of ServerConsole.
   */
  public static getInstance(): ServerConsole {
    if (!ServerConsole.instance) {
      ServerConsole.instance = new ServerConsole();
    }
    return ServerConsole.instance;
  }

  /**
   * Registers default console commands.
   */
  private registerDefaultCommands(): void {
    this.registerCommand({
      name: "ping",
      description: "Checks console responsiveness with a pong reply",
      usage: "ping",
      execute: () => {
        logger.info("pong");
      },
    });
  }

  /**
   * Registers a new console command.
   * @param command The command definition to register.
   */
  public registerCommand(command: ConsoleCommand): this {
    const lowerName = command.name.toLowerCase();
    this.commands.set(lowerName, command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), lowerName);
      }
    }
    return this;
  }

  /**
   * Starts the interactive command-line reader.
   */
  public start(): void {
    if (this.isRunning) return;
    if (process.stdin.destroyed) return;

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      prompt: "> ",
    });

    setActiveReadline(this.rl);
    this.isRunning = true;

    this.rl.on("line", async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) {
        this.rl?.prompt();
        return;
      }

      await this.handleInput(trimmed);

      if (this.isRunning) {
        this.rl?.prompt();
      }
    });

    this.rl.on("close", () => {
      this.stop();
    });

    this.rl.prompt();
  }

  /**
   * Parses and executes a command input string.
   * @param input Raw command input line.
   */
  public async handleInput(input: string): Promise<void> {
    const [commandName, ...args] = input.split(/\s+/);
    if (!commandName) return;

    const lowerName = commandName.toLowerCase();
    const resolvedName = this.aliases.get(lowerName) ?? lowerName;
    const command = this.commands.get(resolvedName);

    if (!command) {
      logger.warn({ command: commandName }, "unknown command. check available commands");
      return;
    }

    try {
      await command.execute(args);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error({ command: commandName, error }, "failed to execute console command");
    }
  }

  /**
   * Stops the interactive console and detaches listeners.
   */
  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    setActiveReadline(null);

    if (this.rl) {
      this.rl.removeAllListeners();
      this.rl.close();
      this.rl = null;
    }
  }
}

export const serverConsole = ServerConsole.getInstance();
