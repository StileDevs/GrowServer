import { readdirSync } from "fs";
import { join } from "path";
import type { Class } from "type-fest";
import type { CommandOptions } from "../../types/commands";

// Dynamic command loading
const commandFiles = readdirSync(__dirname).filter((file) => file.endsWith(".ts") && file !== "index.ts");

export const CommandMap: Record<
  string,
  Class<{
    execute: () => Promise<void>;
    opt: CommandOptions;
  }>
> = {};

// Load each command file
for (const file of commandFiles) {
  const commandModule = require(`./${file}`);
  const CommandClass = Object.values(commandModule)[0] as any;

  // Create temporary instance to access opt
  const tempInstance = new CommandClass(null, null, "", []);

  // Register each command alias
  for (const cmd of tempInstance.opt.command) {
    CommandMap[cmd] = CommandClass;
  }
}
