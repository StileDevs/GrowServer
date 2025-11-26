import { readdirSync } from "fs";
import { join, relative } from "path";
import type { Class } from "type-fest";
import type { CommandOptions } from "@growserver/types";
import logger from "@growserver/logger";

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
  // Define the directories to scan
  const directoriesToScan = [
    __dirname, // Original directory
    join(__dirname, "emotes"), // Added subdirectory 'emotes'
  ];

  // Collect all command file paths from the specified directories first
  const filesToProcess: { directoryPath: string; fileName: string }[] = [];

  for (const dir of directoriesToScan) {
    try {
      const filesInDir = readdirSync(dir).filter(
        (file) =>
          (file.endsWith(".ts") || file.endsWith(".js")) &&
          !file.endsWith(".d.ts") &&
          file !== "index.ts" &&
          file !== "index.js",
      );
      filesInDir.forEach((fileName) => {
        filesToProcess.push({ directoryPath: dir, fileName });
      });
    } catch (error) {
      logger.error(`Error reading directory ${dir}: ${error}`);
    }
  }

  logger.info(`Found ${filesToProcess.length} command files`);

  for (const { directoryPath, fileName: file } of filesToProcess) {
    try {
      const commandName = file.split(".")[0].toLowerCase();
      const fileExt = file.split(".").pop();

      const fullPathForImport = join(directoryPath, file);

      // Log which command is being loaded
      logger.debug(`Loading command: ${commandName} from ${fullPathForImport}`);

      // Use dynamic import with proper path construction
      let CommandClass;
      try {
        // In production, handle JS files
        if (fileExt === "js") {
          const module = await import(fullPathForImport);
          CommandClass = module.default;
        } else {
          //* In development, handle TS files*
          if (process.platform === "win32") {
            const relativePath = relative(__dirname, fullPathForImport);
            const module = await import(
              `./${relativePath.replace(/\\/g, "/")}`
            );
            CommandClass = module.default;
          } else {
            const module = await import(fullPathForImport);
            CommandClass = module.default;
          }
        }

        if (CommandClass) {
          CommandMap[commandName] = CommandClass;
          logger.info(`Loaded command: ${commandName}`);
        } else {
          logger.warn(`Command class not found in ${fullPathForImport}`);
        }
      } catch (importError) {
        logger.error(
          `Failed to import command ${fullPathForImport}: ${importError}`,
        );
      }
    } catch (error) {
      logger.error(`Error processing command file: ${error}`);
    }
  }

  logger.info(`Loaded ${Object.keys(CommandMap).length} commands`);
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
            logger.debug(`Registered alias: ${aliasLower} → ${commandName}`);
          }
        }
      }
    } catch (error) {
      // If we can't create an instance, log the error but continue with other commands
      logger.warn(
        `Could not register aliases for ${commandName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  logger.info(`Command system ready (${aliasCount} aliases registered)`);
};

loadCommands().catch((err) => logger.error("Failed to load commands:", err));
