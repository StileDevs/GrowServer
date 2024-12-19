import { readdirSync } from "fs";
import { join, relative } from "path";
import type { Class } from "type-fest";
import type { CommandOptions } from "../../types/commands";

export const CommandMap: Record<
  string,
  Class<{
    execute: () => Promise<void>;
    opt: CommandOptions;
  }>
> = {};

const loadCommands = async () => {
  const commandFiles = readdirSync(__dirname).filter((file) => (file.endsWith(".ts") || file.endsWith(".js")) && !file.endsWith(".d.ts") && file !== "index.ts");
  for (const file of commandFiles) {
    const commandName = file.split(".")[0];
    const path = relative(__dirname, join(__dirname, file));

    CommandMap[commandName] = await import(`./${path}`);
  }
};

loadCommands().catch(console.error);
