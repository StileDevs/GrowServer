import readline from "node:readline";
import { Writable } from "node:stream";
import pino from "pino";
import pretty from "pino-pretty";

let activeReadline: readline.Interface | null = null;

/**
 * Sets or clears the active readline interface to prevent prompt collisions during logging.
 * @param rl The active readline Interface instance, or null when inactive.
 */
export function setActiveReadline(rl: readline.Interface | null): void {
  activeReadline = rl;
}

const consoleDestination = new Writable({
  write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    const text = chunk.toString();
    if (activeReadline) {
      try {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
      } catch {}
      process.stdout.write(text);
      activeReadline.prompt(true);
    } else {
      process.stdout.write(text);
    }
    callback();
  },
});

const stream = pretty({
  translateTime: "SYS:HH:MM:ss",
  ignore: "pid,hostname",
  colorize: true,
  destination: consoleDestination,
  hideObject: true,
  customPrettifiers: {
    level: (logLevel, _key, log, { colors }) => {
      const logObj = log as Record<string, unknown>;
      const thread = (logObj.thread as string) || "Server thread";
      const levelMap: Record<number, string> = {
        10: "TRACE",
        20: "DEBUG",
        30: "INFO",
        40: "WARN",
        50: "ERROR",
        60: "FATAL",
      };
      const numLevel = typeof logLevel === "number" ? logLevel : Number(logObj.level) || 30;
      const lvlStr = levelMap[numLevel] || String(logLevel).toUpperCase();

      if (colors) {
        let coloredLevel = lvlStr;
        if (numLevel <= 20) coloredLevel = colors.gray(lvlStr);
        else if (numLevel === 30) coloredLevel = colors.green(lvlStr);
        else if (numLevel === 40) coloredLevel = colors.yellow(lvlStr);
        else if (numLevel >= 50) coloredLevel = colors.red(lvlStr);
        return `[${colors.cyan(thread)}/${coloredLevel}]:`;
      }
      return `[${thread}/${lvlStr}]:`;
    },
  },
  messageFormat: (log: Record<string, unknown>, messageKey: string) => {
    const msg = (log[messageKey] as string) || "";

    const builtInKeys = ["level", "time", "pid", "hostname", messageKey, "v", "thread"];

    const attributes = Object.keys(log)
      .filter((key) => !builtInKeys.includes(key))
      .map((key) => {
        const val = log[key];
        if (typeof val === "string") return `${key}="${val}"`;
        if (typeof val === "object" && val !== null)
          return `${key}=${JSON.stringify(val)}`;
        return `${key}=${val}`;
      });

    if (attributes.length === 0) return msg;

    return `${msg} ${attributes.join(", ")}`;
  },
});

export const logger = pino(stream);

