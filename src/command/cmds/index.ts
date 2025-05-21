import { readdirSync } from "fs";
import { join, relative } from "path";
import type { Class } from "type-fest";
import type { CommandOptions } from "../../types/commands";
import consola from "consola";

export const CommandMap: Record<
  string,
  Class<{
    execute: () => Promise<void>;
    opt: CommandOptions;
  }>
> = {};

// Map to track which command aliases belong to which original command
export const CommandsAliasMap: Record<string, string> = {};

const loadCommands = async () => {
  // Get list of command files, filtering out the index file
  const commandFiles = readdirSync(__dirname).filter(
    (file) =>
      (file.endsWith(".ts") || file.endsWith(".js")) &&
      !file.endsWith(".d.ts") &&
      file !== "index.ts" &&
      file !== "index.js"
  );

  consola.info(`Found ${commandFiles.length} command files`);

  for (const file of commandFiles) {
    try {
      const commandName = file.split(".")[0].toLowerCase();
      const fileExt = file.split(".").pop();

      // Log which command is being loaded
      consola.debug(`Loading command: ${commandName} from ${file}`);

      // Use dynamic import with proper path construction
      let CommandClass;
      try {
        // In production, handle JS files
        if (fileExt === "js") {
          const module = await import(join(__dirname, file));
          CommandClass = module.default;
        } else {
          // In development, handle TS files
          const module = await import(`./${commandName}`);
          CommandClass = module.default;
        }

        if (CommandClass) {
          CommandMap[commandName] = CommandClass;
          consola.success(`Loaded command: ${commandName}`);
        } else {
          consola.warn(`Command class not found in ${file}`);
        }
      } catch (importError) {
        consola.error(`Failed to import command ${file}:`, importError);
      }
    } catch (error) {
      consola.error(`Error processing command file:`, error);
    }
  }

  consola.info(`Loaded ${Object.keys(CommandMap).length} commands`);
};

// This function registers all command aliases after server is fully initialized
export const registerAliases = async (): Promise<void> => {
  let aliasCount = 0;

  // Iterate through each command
  for (const [commandName, CommandClass] of Object.entries(CommandMap)) {
    try {
      // Create a temporary instance to access the command options
      // Use empty parameters or dummy objects that won't cause errors
      const dummyBase = { cache: { cooldown: new Map() } };
      const dummyPeer = {};

      // Create instance with minimal required properties
      const tempCmd = new CommandClass(dummyBase, dummyPeer, "", []);

      // Register all aliases for this command
      if (tempCmd.opt && Array.isArray(tempCmd.opt.command)) {
        for (const alias of tempCmd.opt.command) {
          const aliasLower = alias.toLowerCase();

          // Don't register the main command name as an alias of itself
          if (aliasLower !== commandName) {
            CommandsAliasMap[aliasLower] = commandName;
            aliasCount++;
            consola.debug(`Registered alias: ${aliasLower} → ${commandName}`);
          }
        }
      }
    } catch (error) {
      // If we can't create an instance, log the error but continue with other commands
      consola.warn(
        `Could not register aliases for ${commandName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  consola.success(`Command system ready (${aliasCount} aliases registered)`);
};

loadCommands().catch((err) => consola.error("Failed to load commands:", err));
