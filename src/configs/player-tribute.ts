import { TOML } from "bun";
import { readFile, writeFile, access, mkdir } from "fs/promises";
import { constants } from "fs";
import { join, dirname } from "path";
import { logger } from "../utils/logger";

/**
 * Configuration for Tab 1: Epic Players / Hall of Fame.
 */
export interface EpicPlayersConfig {
  /** List of player names to honor (displayed separated by semicolons in-game) */
  players?: string[];
  /** Optional raw string override */
  raw?: string;
}

/**
 * Configuration for Tab 2: Special Tribute / Mentors / Grow4Good.
 */
export interface SpecialTributeConfig {
  /** Custom message banner */
  message?: string;
  /** Optional list of players */
  players?: string[];
  /** Optional raw string override */
  raw?: string;
}

/**
 * Configuration for Tab 3: Yearly Honorees / Annual Contributors.
 */
export interface YearlyHonoreesConfig {
  /** Optional raw string override */
  raw?: string;
  /** Yearly lists of honored players keyed by year string (e.g. "2026", "2025") */
  [year: string]: string[] | string | undefined;
}

/**
 * Single month podium entry for Tab 4.
 */
export interface MonthlyChampion {
  year: number;
  month: string;
  first?: string;
  second?: string;
  third?: string;
}

/**
 * Root structure for player-tribute.toml.
 */
export interface PlayerTributeConfig {
  epic_players?: EpicPlayersConfig;
  special_tribute?: SpecialTributeConfig;
  yearly_honorees?: YearlyHonoreesConfig;
  monthly_champions?: MonthlyChampion[];
  /** Optional raw string override for Tab 4 */
  monthly_raw?: string;
  monthly_champions_config?: {
    raw?: string;
  };
}

/**
 * Default TOML content seeded with the official Growtopia player tribute records.
 */
export const DEFAULT_PLAYER_TRIBUTE_TOML = `# GrowServer Player Tribute Configuration
# This file manages the four tabs shown in the in-game Player Tribute screen.
# You can easily edit player lists, custom messages, and monthly champions here.
# GrowServer compiles this configuration into player-tribute.dat binary format.

[epic_players]
# Tab 1: Hall of Fame / Epic Players (separated by semicolons in-game)
# Add, remove, or reorder player names in this array.
players = [
  "Zraei",
  "Danieldd",
  "SLaminator",
  "TK69",
  "JackBowe",
  "bllade",
  "Noodle",
  "SaeedRu",
  "erwinher",
  "Crabbitz",
  "sSpark",
  "Pinuski",
  "Climper",
  "Loki",
  "OmriTheBest",
  "FrEAkR",
  "ChiggaLam",
  "Occean",
  "Lantern",
  "Growmoji",
  "Links",
  "chat",
  "uzxi",
  "14DEViL",
  "NewWool",
  "Kuwii",
  "Me11e",
  "Muni",
  "swiftpie",
  "Spiezels",
  "Xenoso",
]

[special_tribute]
# Tab 2: Special Tribute / Mentors / Grow4Good
# Custom message or congratulations banner displayed on the second tab.
message = "No players are this amazing yet! Could you be the first?"

[yearly_honorees]
# Tab 3: Yearly Honorees / Annual Contributors
# Grouped by year. GrowServer automatically generates the yellow year headers and proper spacing.
"2026" = ["a20kaFan", "Emo", "GhostAroundYou", "Spy", "Nestle", "sermonic", "Lilyciana", "iPlayfuls", "Lantern", "sSkullie", "SharkOwl", "PTDU", "READex", "HeroPlaya", "Vanguard", "NewWool", "i72", "Disaster", "RBAYS", "iCZE"]
"2025" = ["JackBowe", "ashuex", "Disenchantment", "idontcaredude", "StamfordRaffles", "yFire", "VoidSg", "Shaex", "Prestigeset", "Nah", "One", "brokibear", "SuperSemOK", "DDatG", "swiftpie", "Assistor", "slayer7"]
"2024" = ["Castor", "Koreano", "Krustie", "Genji", "Discover", "Salt", "Pinuski", "Polleroo", "ImLOT", "TheProphecy", "JackBowe", "ItsBeefy", "Spiezels", "AnimeLords"]
"2023" = ["Snake", "EmoFate", "Who", "JackBowe", "uzxi", "Rumors", "PrideChan", "SAYGI", "Voleee"]
"2022" = ["Awanight", "bontra", "JackBowe", "Creano", "emo", "Sea", "Durains", "GTKenneth", "GDPking"]

# Tab 4: Monthly Champions / Ranked Podium Winners
# Each block represents the 1st, 2nd, and 3rd place winners for a specific month.

[[monthly_champions]]
year = 2026
month = "Aug"
first = "Mutanist"
second = "PotaSG"
third = "DaveMustang"

[[monthly_champions]]
year = 2026
month = "Jul"
first = "dinrah"
second = "Haspal"
third = "JuLim"

[[monthly_champions]]
year = 2026
month = "Jun"
first = "yunmori"
second = "Baddie"
third = "Leyendas"

[[monthly_champions]]
year = 2026
month = "May"
first = "JuLim"
second = "Wamzi"
third = "Drovan"

[[monthly_champions]]
year = 2026
month = "Apr"
first = "Gaxy"
second = "dinrah"
third = "Loor"

[[monthly_champions]]
year = 2026
month = "Mar"
first = "Emo"
second = "SupCard"
third = "Provenances"

[[monthly_champions]]
year = 2026
month = "Feb"
first = "Spiezels"
second = "MejiroDober"
third = "BonaOBrien"

[[monthly_champions]]
year = 2026
month = "Jan"
first = "uzxi"
second = "solerist"
third = "Amadeaus"

[[monthly_champions]]
year = 2025
month = "Dec"
first = "JONDAZZ"
second = "Vinlio"
third = "Dwmir"

[[monthly_champions]]
year = 2025
month = "Nov"
first = "SWoPiX"
second = "Tengzs"
third = "Wuke"

[[monthly_champions]]
year = 2025
month = "Oct"
first = "Emo"
second = "Castor"
third = "ismet"

[[monthly_champions]]
year = 2025
month = "Sept"
first = "RAJAMANIA"
second = "LucaZo"
third = "Tengzs"

[[monthly_champions]]
year = 2025
month = "Aug"
first = "7isn"
second = "KylerPC"
third = "AkioSensei"

[[monthly_champions]]
year = 2025
month = "Jul"
first = "Castor"
second = "YiWai"
third = "ihave99999aura"

[[monthly_champions]]
year = 2025
month = "Jun"
first = "StamfordRaffles"
second = "Spiezels"
third = "Castor"

[[monthly_champions]]
year = 2025
month = "May"
first = "LastFamous"
second = ""
third = "iFlySolo"

[[monthly_champions]]
year = 2025
month = "Apr"
first = "couldvedonebetter"
second = "iFlySolo"
third = "CizF"

[[monthly_champions]]
year = 2025
month = "Mar"
first = "woyren"
second = "Purringg"
third = "shinyii"

[[monthly_champions]]
year = 2025
month = "Feb"
first = "uzxi"
second = "GhostAroundYou"
third = "NIGHTBABA"

[[monthly_champions]]
year = 2025
month = "Jan"
first = "Bontra"
second = "Haspal"
third = "Jumrahs"

[[monthly_champions]]
year = 2024
month = "Dec"
first = "Bontra"
second = "Atoms"
third = "kuwii"

[[monthly_champions]]
year = 2024
month = "Nov"
first = "uzxi"
second = "Bontra"
third = "HeroPlaya"

[[monthly_champions]]
year = 2024
month = "Oct"
first = "Bontra"
second = "SWoPiX"
third = "666Twoxy666"

[[monthly_champions]]
year = 2024
month = "Sep"
first = "Bontra"
second = ""
third = ""

[[monthly_champions]]
year = 2024
month = "Aug"
first = "Bontra"
second = ""
third = "Yerfdoq"

[[monthly_champions]]
year = 2024
month = "Jul"
first = "Bontra"
second = "Cool010"
third = "xattygts"

[[monthly_champions]]
year = 2024
month = "Jun"
first = ""
second = "14DEViL"
third = "Maekol"

[[monthly_champions]]
year = 2024
month = "May"
first = "bontra"
second = ""
third = "Konetzy"

[[monthly_champions]]
year = 2024
month = "Apr"
first = "Creano"
second = ""
third = ""

[[monthly_champions]]
year = 2024
month = "Mar"
first = "bontra"
second = ""
third = ""
`;

let cachedConfig: PlayerTributeConfig | null = null;
let cachedBuffer: Buffer | null = null;

/**
 * Checks if a file exists and is readable.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the player tribute TOML configuration path.
 */
export async function resolvePlayerTributeConfigPath(): Promise<string> {
  const possiblePaths = [
    join("configs", "player-tribute.toml"),
    join(process.cwd(), "configs", "player-tribute.toml"),
    "player-tribute.toml",
    join(process.cwd(), "player-tribute.toml"),
    join(dirname(process.execPath), "configs", "player-tribute.toml"),
    join(dirname(process.execPath), "player-tribute.toml"),
  ];

  for (const p of possiblePaths) {
    if (await fileExists(p)) {
      return p;
    }
  }

  return join(process.cwd(), "configs", "player-tribute.toml");
}

/**
 * Converts PlayerTributeConfig into the 4 string sections expected by Growtopia.
 */
export function formatTributeSections(config: PlayerTributeConfig): [string, string, string, string] {
  // Section 0: Epic Players (Tab 1)
  let sec0 = "";
  if (config.epic_players?.raw) {
    sec0 = config.epic_players.raw;
  } else if (Array.isArray(config.epic_players?.players)) {
    const list = config.epic_players.players.map((p) => String(p).trim()).filter(Boolean);
    sec0 = list.join(" ; ") + (list.length > 0 ? " ;" : "");
  }

  // Section 1: Special Tribute (Tab 2)
  let sec1 = "";
  if (config.special_tribute?.raw) {
    sec1 = config.special_tribute.raw;
  } else if (Array.isArray(config.special_tribute?.players) && config.special_tribute.players.length > 0) {
    const list = config.special_tribute.players.map((p) => String(p).trim()).filter(Boolean);
    sec1 = list.join(" ; ") + (list.length > 0 ? " ;" : "");
  } else if (config.special_tribute?.message) {
    sec1 = String(config.special_tribute.message).trim();
  }

  // Section 2: Yearly Honorees (Tab 3)
  let sec2 = "";
  if (config.yearly_honorees?.raw) {
    sec2 = config.yearly_honorees.raw;
  } else if (config.yearly_honorees && typeof config.yearly_honorees === "object") {
    const years = Object.keys(config.yearly_honorees)
      .filter((k) => k !== "raw" && /^\d+$/.test(k))
      .sort((a, b) => Number(b) - Number(a));

    const yearBlocks: string[] = [];
    for (const yr of years) {
      const val = config.yearly_honorees[yr];
      const players = Array.isArray(val) ? val : typeof val === "string" ? [val] : [];
      const namesStr = players.map((p) => String(p).trim()).filter(Boolean).join(" ; ");
      yearBlocks.push("`6" + yr + ":`` " + namesStr + " ");
    }
    sec2 = yearBlocks.join("<CR><CR>");
  }

  // Section 3: Monthly Champions (Tab 4)
  let sec3 = "";
  if (config.monthly_raw) {
    sec3 = config.monthly_raw;
  } else if (config.monthly_champions_config?.raw) {
    sec3 = config.monthly_champions_config.raw;
  } else if (Array.isArray(config.monthly_champions)) {
    const byYear = new Map<number, MonthlyChampion[]>();
    for (const c of config.monthly_champions) {
      const yr = Number(c.year) || 0;
      if (!byYear.has(yr)) byYear.set(yr, []);
      byYear.get(yr)!.push(c);
    }

    const sortedYears = Array.from(byYear.keys()).sort((a, b) => b - a);
    const parts: string[] = [];
    for (const yr of sortedYears) {
      parts.push("`6" + yr + "<CR>");
      const months = byYear.get(yr)!;
      for (const m of months) {
        const first = m.first ? String(m.first).trim() : "";
        const second = m.second ? String(m.second).trim() : "";
        const third = m.third ? String(m.third).trim() : "";
        parts.push(
          "```6 - " + m.month + ": ```91st - ``" + first + ", `12nd - ``" + second + ", `o3rd - ``" + third + " <CR>"
        );
      }
    }
    sec3 = parts.join("");
  }

  return [sec0, sec1, sec2, sec3];
}

/**
 * Encodes player tribute sections into Growtopia binary format (4 length-prefixed strings).
 */
export function encodePlayerTribute(configOrSections: PlayerTributeConfig | [string, string, string, string]): Buffer {
  const sections: [string, string, string, string] = Array.isArray(configOrSections)
    ? configOrSections
    : formatTributeSections(configOrSections);

  const buffers = sections.map((s) => Buffer.from(s, "utf8"));
  const totalLength = buffers.reduce((acc, b) => acc + 2 + b.length, 0);
  const out = Buffer.alloc(totalLength);

  let offset = 0;
  for (const b of buffers) {
    out.writeUInt16LE(b.length, offset);
    offset += 2;
    b.copy(out, offset);
    offset += b.length;
  }

  return out;
}

/**
 * Decodes a raw Growtopia player_tribute.dat binary buffer into 4 string sections and a parsed config.
 */
export function decodePlayerTribute(buffer: Buffer): {
  sections: [string, string, string, string];
  config: PlayerTributeConfig;
} {
  let offset = 0;
  const sections: string[] = [];

  for (let i = 0; i < 4; i++) {
    if (offset + 2 > buffer.length) break;
    const len = buffer.readUInt16LE(offset);
    offset += 2;
    const str = buffer.subarray(offset, offset + len).toString("utf8");
    offset += len;
    sections.push(str);
  }

  while (sections.length < 4) {
    sections.push("");
  }

  const s0 = sections[0]!;
  const s1 = sections[1]!;
  const s2 = sections[2]!;
  const s3 = sections[3]!;

  // Parse Epic Players
  const epicPlayers = s0
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  // Parse Yearly Honorees
  const yearlyMap: Record<string, string[]> = {};
  const yearBlocks = s2.split("<CR><CR>");
  for (const block of yearBlocks) {
    const match = block.match(/`6(\d{4}):``\s*(.*)/s);
    if (match) {
      const yr = match[1]!;
      const names = match[2]!
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      yearlyMap[yr] = names;
    }
  }

  // Parse Monthly Champions
  const champions: MonthlyChampion[] = [];
  let currentYear = new Date().getFullYear();
  const sec3Lines = s3.split("<CR>");
  for (const line of sec3Lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const yearHeaderMatch = trimmed.match(/^`6(\d{4})/);
    if (yearHeaderMatch && !trimmed.includes("1st")) {
      currentYear = parseInt(yearHeaderMatch[1]!, 10);
      continue;
    }

    const monthMatch = trimmed.match(
      /(?:`6\s*)?-\s*([A-Za-z]+):\s*```?91st\s*-\s*``([^,]*),\s*`12nd\s*-\s*``([^,]*),\s*`o3rd\s*-\s*``(.*)/
    );
    if (monthMatch) {
      champions.push({
        year: currentYear,
        month: monthMatch[1]!.trim(),
        first: monthMatch[2]!.trim(),
        second: monthMatch[3]!.trim(),
        third: monthMatch[4]!.trim(),
      });
    }
  }

  const config: PlayerTributeConfig = {
    epic_players: { players: epicPlayers },
    special_tribute: { message: s1 },
    yearly_honorees: yearlyMap,
    monthly_champions: champions,
  };

  return {
    sections: [s0, s1, s2, s3],
    config,
  };
}

/**
 * Loads the player tribute configuration from TOML.
 * If configs/player-tribute.toml does not exist, it will automatically generate it.
 */
export async function loadPlayerTributeConfig(forceReload = false): Promise<PlayerTributeConfig> {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  const configPath = await resolvePlayerTributeConfigPath();
  const exists = await fileExists(configPath);

  if (!exists) {
    try {
      await mkdir(dirname(configPath), { recursive: true });
      await writeFile(configPath, DEFAULT_PLAYER_TRIBUTE_TOML, "utf-8");
      logger.info({ path: configPath }, "generated default player-tribute.toml");
    } catch (err) {
      logger.warn({ err: String(err), path: configPath }, "failed to auto-generate player-tribute.toml");
    }
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const parsed = TOML.parse(content) as unknown as PlayerTributeConfig;
    cachedConfig = parsed;
    cachedBuffer = encodePlayerTribute(parsed);
    logger.info({ path: configPath }, "player tribute configuration loaded");
    return parsed;
  } catch (error) {
    logger.error({ err: String(error), path: configPath }, "failed to parse player-tribute.toml, fallback to default");
    const fallback = TOML.parse(DEFAULT_PLAYER_TRIBUTE_TOML) as unknown as PlayerTributeConfig;
    cachedConfig = fallback;
    cachedBuffer = encodePlayerTribute(fallback);
    return fallback;
  }
}

/**
 * Compiles the player tribute configuration into binary format and writes it to disk.
 * @param outputPath Target file path (defaults to .cache/player-tribute.dat)
 */
export async function compilePlayerTributeDat(outputPath?: string): Promise<Buffer> {
  const config = await loadPlayerTributeConfig(true);
  const buffer = encodePlayerTribute(config);

  const target = outputPath || join(process.cwd(), ".cache", "player-tribute.dat");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  logger.info({ path: target, size: buffer.length }, "player-tribute.dat compiled successfully");

  cachedBuffer = buffer;
  return buffer;
}

/**
 * Retrieves the compiled player tribute binary buffer for network packet transmission.
 */
export async function getPlayerTributeBuffer(forceReload = false): Promise<Buffer> {
  if (cachedBuffer && !forceReload) {
    return cachedBuffer;
  }

  const config = await loadPlayerTributeConfig(forceReload);
  cachedBuffer = encodePlayerTribute(config);
  return cachedBuffer;
}

// Standalone execution runner: bun run src/configs/player-tribute.ts
if (import.meta.main) {
  (async () => {
    try {
      const configPath = await resolvePlayerTributeConfigPath();
      const config = await loadPlayerTributeConfig(true);

      const targetPath = join(process.cwd(), ".cache", "player-tribute.dat");
      const buffer = await compilePlayerTributeDat(targetPath);

      logger.info(
        {
          config: configPath,
          target: targetPath,
          size: buffer.length,
          epicPlayers: config.epic_players?.players?.length ?? 0,
          podiums: config.monthly_champions?.length ?? 0,
        },
        "player tribute initialization completed",
      );
    } catch (error) {
      logger.error({ err: error instanceof Error ? error.message : String(error) }, "player tribute runner failed");
      process.exit(1);
    }
  })();
}
