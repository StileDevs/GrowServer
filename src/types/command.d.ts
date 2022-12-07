export interface CommandOptions {
  name: string;
  description: string;
  /** Cooldown command per seconds. */
  cooldown: number;
  /** Limiting command usage. */
  ratelimit: number;
  category: string;
  usage: string;
  example: string[];
  permission: string[];
}

export interface CooldownOptions {
  limit: number;
  time: number;
}
