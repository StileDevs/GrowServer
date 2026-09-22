import { readFile, writeFile, mkdir, access } from "fs/promises";
import { constants } from "fs";
import { join, dirname } from "path";
import { ItemsDat } from "grow-items";
import { logger } from "../../utils/logger";
import { protonSDKHash } from "../../utils/proton";
import { deflate, deflateSync } from "zlib";
import { compilePlayerTributeDat } from "../../configs/player-tribute";

export let playerTributeRaw: Buffer;
export let playerTributeHash: number;

export let itemsRaw: Buffer;
export let itemsCompressed: Buffer;

export let items: ItemsDat;
export let itemsHash: number;

// items data that encoded from original items.dat
export let itemsModifiedRaw: Buffer;
export let itemsModifiedCompressed: Buffer;
export let itemsModified: ItemsDat;
export let itemsModifiedHash: number;

const ITEMS_ARCHIVE_LATEST_URL = "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/main/latest.json";
const ITEMS_ARCHIVE_BASE_URL = "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/main";

/**
 * Checks if a file exists and is readable.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

interface ItemsArchiveItem {
  content: string;
  hash?: number;
}

interface ItemsArchiveMetadata {
  latest?: ItemsArchiveItem | string;
  content?: string;
  old_items?: ItemsArchiveItem[];
}

/**
 * Downloads the latest items.dat from StileDevs/itemsdat-archive.
 */
async function downloadLatestItemsDat(destinationPath: string): Promise<void> {
  logger.info("fetching latest items.dat metadata from archive...");
  const res = await fetch(ITEMS_ARCHIVE_LATEST_URL);
  if (!res.ok) {
    throw new Error(`failed to fetch latest items info: ${res.status} ${res.statusText}`);
  }

  const metadata = (await res.json()) as ItemsArchiveMetadata;
  const fileName =
    typeof metadata.latest === "object" && metadata.latest?.content
      ? metadata.latest.content
      : typeof metadata.latest === "string"
        ? metadata.latest
        : metadata.content;

  if (!fileName) {
    throw new Error("invalid latest.json payload from items archive");
  }

  const expectedHash = typeof metadata.latest === "object" ? metadata.latest?.hash : undefined;
  const fileUrl = `${ITEMS_ARCHIVE_BASE_URL}/${fileName}`;
  logger.info({ file: fileName, url: fileUrl, expectedHash }, "downloading items.dat from archive...");

  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) {
    throw new Error(`failed to download ${fileName}: ${fileRes.status} ${fileRes.statusText}`);
  }

  const buffer = await fileRes.arrayBuffer();
  const dir = dirname(destinationPath);
  await mkdir(dir, { recursive: true });
  await writeFile(destinationPath, Buffer.from(buffer));

  logger.info({ file: fileName, path: destinationPath }, "items.dat downloaded successfully");
}

export async function resolvePlayerTributePath(): Promise<string> {
  const possiblePaths = [
    join(".cache", "player-tribute.dat"),
    join("configs", "player-tribute.dat"),
    "player-tribute.dat",
    "player_tribute.dat",
    join(process.cwd(), ".cache", "player-tribute.dat"),
    join(process.cwd(), "configs", "player-tribute.dat"),
    join(process.cwd(), "player-tribute.dat"),
    join(process.cwd(), "player_tribute.dat"),
    join(dirname(process.execPath), ".cache", "player-tribute.dat"),
    join(dirname(process.execPath), "configs", "player-tribute.dat"),
  ];

  for (const path of possiblePaths) {
    if (await fileExists(path)) {
      return path;
    }
  }

  const targetCachePath = join(".cache", "player-tribute.dat");
  await compilePlayerTributeDat(targetCachePath);
  return targetCachePath;
}

/**
 * Resolves the path to items.dat looking in .cache/ first, then configs/, then root.
 * If not found, downloads the latest version into .cache/items.dat.
 */
async function resolveItemsDatPath(): Promise<string> {
  const possiblePaths = [
    join(".cache", "items.dat"),
    join("configs", "items.dat"),
    "items.dat",
    join(process.cwd(), ".cache", "items.dat"),
    join(process.cwd(), "configs", "items.dat"),
    join(process.cwd(), "items.dat"),
    join(dirname(process.execPath), ".cache", "items.dat"),
    join(dirname(process.execPath), "configs", "items.dat"),
  ];

  for (const path of possiblePaths) {
    if (await fileExists(path)) {
      return path;
    }
  }

  const targetCachePath = join(".cache", "items.dat");
  await downloadLatestItemsDat(targetCachePath);
  return targetCachePath;
}

export function compress(buf: Buffer): Buffer {
  return deflateSync(buf);
}

/**
 * Initializes and decodes the items database from items.dat.
 */
export async function initItems(): Promise<void> {
  try {
    const itemsPath = await resolveItemsDatPath();
    const fileData = await readFile(itemsPath);
    itemsRaw = fileData;
    items = new ItemsDat(Array.from(fileData));
    await items.decode();
    itemsHash = protonSDKHash(Array.from(fileData));
    itemsCompressed = compress(itemsRaw);
    logger.info({ count: items.meta.itemCount, version: items.meta.version, hash: itemsHash, path: itemsPath }, "items.dat loaded successfully");

    // player tribute
    const playerTributePath = await resolvePlayerTributePath();
    playerTributeRaw = await readFile(playerTributePath);
    playerTributeHash = protonSDKHash(Array.from(playerTributeRaw));
    logger.info({ path: playerTributePath }, "player-tribute.dat loaded successfully");

    // apply custom items from .cache/custom-items.json (or auto-build if not present)
    const possibleManifestPaths = [
      join(".cache", "custom-items.json"),
      join(process.cwd(), ".cache", "custom-items.json"),
      join(dirname(process.execPath), ".cache", "custom-items.json"),
    ];

    let customItemsManifest: {
      items: Array<{ id: number; targetPath: string; hash: number; targetField: "extraFile" | "texture"; overrides?: Record<string, any> }>;
    } | null = null;

    for (const p of possibleManifestPaths) {
      if (await fileExists(p)) {
        try {
          const raw = await readFile(p, "utf-8");
          customItemsManifest = JSON.parse(raw);
          break;
        } catch {}
      }
    }

    if (!customItemsManifest) {
      try {
        const { buildAssets } = await import("../../scripts/build-assets");
        await buildAssets();
        for (const p of possibleManifestPaths) {
          if (await fileExists(p)) {
            const raw = await readFile(p, "utf-8");
            customItemsManifest = JSON.parse(raw);
            break;
          }
        }
      } catch (err) {
        logger.warn({ err }, "failed to auto-compile custom item assets");
      }
    }

    if (customItemsManifest && Array.isArray(customItemsManifest.items)) {
      for (const customItem of customItemsManifest.items) {
        const existing = items.meta.items.get(customItem.id);
        if (!existing) {
          logger.warn({ id: customItem.id }, "custom item target id not found in items.dat");
          continue;
        }

        const updated = { ...existing, ...(customItem.overrides || {}) };
        if (customItem.targetField === "extraFile") {
          updated.extraFile = customItem.targetPath;
          updated.extraFileHash = customItem.hash;
        } else {
          updated.texture = customItem.targetPath;
          updated.textureHash = customItem.hash;
        }

        items.meta.items.set(customItem.id, updated);
        logger.info({ id: customItem.id, field: customItem.targetField, path: customItem.targetPath }, "custom item applied to items.dat");
      }
    }

    await items.encode();
    itemsModifiedRaw = Buffer.from(items.buffer.data);
    itemsModifiedCompressed = compress(itemsModifiedRaw);
    itemsModifiedHash = protonSDKHash(Array.from(itemsModifiedRaw));

    logger.info({ itemsHash, playerTributeHash, itemsModifiedHash }, "items.dat & player-tribute.dat loaded successfully");
  } catch (err) {
    logger.error({ err }, "failed to load items.dat & player-tribute.dat");
    throw err;
  }
}
