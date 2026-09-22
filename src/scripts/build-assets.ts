import { readFile, writeFile, mkdir, readdir, access } from "fs/promises";
import { constants } from "fs";
import { join, relative, dirname, basename } from "path";
import { TOML } from "bun";
import { RTTEX } from "../utils/proton";
import { logger } from "../utils/logger";
import type { ItemsInfo, CombineRecipe } from "./generate-wiki";

export interface CustomItemWikiConf {
  name?: string;
  desc?: string;
  chi?: string;
  recipe?: {
    splice?: number[];
    combine?: CombineRecipe;
  };
  func?: {
    add?: string;
    rem?: string;
  };
  play_mods?: string[];
  playMods?: string[];
}

export interface CustomItemConf {
  id: number;
  target?: "extra_file" | "texture" | "extraFile";
  item?: Record<string, any>;
  wiki?: CustomItemWikiConf;
}

export interface CompiledCustomItem {
  id: number;
  targetPath: string;
  hash: number;
  targetField: "extraFile" | "texture";
  overrides?: Record<string, any>;
  wiki?: CustomItemWikiConf;
}

export interface CustomItemsManifest {
  version: number;
  items: CompiledCustomItem[];
}

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

/**
 * Recursively finds all conf.toml files within a directory.
 */
async function findConfigFiles(dir: string): Promise<string[]> {
  if (!(await fileExists(dir))) {
    return [];
  }
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findConfigFiles(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase() === "conf.toml") {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Resolves the directory for custom items source files.
 */
async function resolveCustomItemsDir(): Promise<string> {
  const candidates = [
    join(process.cwd(), "resources", "custom-items"),
    join(dirname(process.execPath), "resources", "custom-items"),
  ];

  for (const dir of candidates) {
    if (await fileExists(dir)) {
      return dir;
    }
  }

  return join(process.cwd(), "resources", "custom-items");
}

/**
 * Merges custom items wiki metadata from conf.toml into .cache/wiki.json.
 */
export async function mergeCustomItemsWiki(
  customItems: Array<{ id: number; overrides?: Record<string, any>; wiki?: CustomItemWikiConf }>,
  wikiPath: string = join(process.cwd(), ".cache", "wiki.json"),
): Promise<void> {
  if (customItems.length === 0) {
    return;
  }

  // Only merge if wiki.json already exists; avoid generating dummy wiki.json
  if (!(await fileExists(wikiPath))) {
    return;
  }

  let wikiList: ItemsInfo[] = [];

  try {
    const raw = await readFile(wikiPath, "utf-8");
    wikiList = JSON.parse(raw);
  } catch (err) {
    logger.warn({ err, path: wikiPath }, "failed to parse existing wiki.json, initializing new list");
    wikiList = [];
  }

  let updatedCount = 0;

  for (const customItem of customItems) {
    const id = customItem.id;
    const existingIndex = wikiList.findIndex((it) => it.id === id);
    const existing = existingIndex >= 0 ? wikiList[existingIndex] : undefined;

    const wikiConf = customItem.wiki || {};
    const itemName = wikiConf.name || customItem.overrides?.name || existing?.name || `Custom Item ${id}`;

    const playMods = wikiConf.play_mods ?? wikiConf.playMods ?? existing?.playMods;

    let combineRecipe: CombineRecipe | undefined;
    const rawCombine = wikiConf.recipe?.combine ?? existing?.recipe?.combine;
    if (rawCombine) {
      combineRecipe = {
        items: rawCombine.items ?? [],
        resultAmount: (rawCombine as any).result_amount ?? rawCombine.resultAmount ?? 1,
      };
    }

    const mergedEntry: ItemsInfo = {
      id,
      name: itemName,
      desc: wikiConf.desc ?? existing?.desc ?? "",
      chi: wikiConf.chi ?? existing?.chi ?? "",
      recipe: {
        splice: wikiConf.recipe?.splice ?? existing?.recipe?.splice ?? [],
        ...(combineRecipe ? { combine: combineRecipe } : {}),
      },
      func: {
        add: wikiConf.func?.add ?? existing?.func?.add ?? "",
        rem: wikiConf.func?.rem ?? existing?.func?.rem ?? "",
      },
      ...(playMods ? { playMods } : {}),
    };

    if (existingIndex >= 0) {
      wikiList[existingIndex] = { ...existing, ...mergedEntry };
    } else {
      wikiList.push(mergedEntry);
    }

    updatedCount++;
    logger.info({ id, name: itemName }, "custom item wiki metadata merged");
  }

  await mkdir(dirname(wikiPath), { recursive: true });
  await writeFile(wikiPath, JSON.stringify(wikiList, null, 2), "utf-8");

  logger.info({ path: wikiPath, count: updatedCount }, "wiki.json updated with custom items");
}

/**
 * Builds custom items assets by converting PNG files to RTTEX and generating a metadata manifest.
 */
export async function buildAssets(): Promise<void> {
  const customItemsDir = await resolveCustomItemsDir();
  const hasCustomItemsDir = await fileExists(customItemsDir);
  if (!hasCustomItemsDir) {
    const { autoGenerateCustomItems } = await import("../resources");
    await autoGenerateCustomItems(customItemsDir);
  }

  const cdnStaticDir = join(dirname(customItemsDir), "cdn-static");
  const cacheDir = join(process.cwd(), ".cache");

  await mkdir(cdnStaticDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });

  const configFiles = await findConfigFiles(customItemsDir);
  const compiledItems: CompiledCustomItem[] = [];

  logger.info({ count: configFiles.length }, "found custom item configurations to compile");

  for (const confPath of configFiles) {
    const itemDir = dirname(confPath);
    const relativeItemDir = relative(customItemsDir, itemDir).replace(/\\/g, "/");

    const confRaw = await readFile(confPath, "utf-8");
    const conf = TOML.parse(confRaw) as unknown as CustomItemConf;

    if (!conf.id) {
      logger.warn({ path: confPath }, "skipping conf.toml missing required item id");
      continue;
    }

    // Find PNG files in the item directory
    const dirEntries = await readdir(itemDir);
    const pngFiles = dirEntries.filter((f) => f.toLowerCase().endsWith(".png"));

    if (pngFiles.length === 0) {
      logger.warn({ path: itemDir }, "no png files found in custom item directory");
      continue;
    }

    // Use the primary PNG file (or match the directory/banner name)
    const primaryPng = pngFiles.find((f) => f.toLowerCase().startsWith(basename(itemDir).toLowerCase())) || pngFiles[0]!;
    const pngPath = join(itemDir, primaryPng);
    const pngBuffer = await readFile(pngPath);

    // Compile PNG to RTTEX
    const rttexBuffer = await RTTEX.encode(pngBuffer);
    const rttexHash = RTTEX.hash(rttexBuffer);

    // Target relative path: e.g. "growserver/interface/banner.rttex"
    const targetRelativePath = `${relativeItemDir}.rttex`;
    const targetDiskPath = join(cdnStaticDir, targetRelativePath);

    await mkdir(dirname(targetDiskPath), { recursive: true });
    await writeFile(targetDiskPath, rttexBuffer);

    // Determine target item field (extraFile vs texture)
    let targetField: "extraFile" | "texture" = "texture";
    if (conf.target === "extra_file" || conf.target === "extraFile") {
      targetField = "extraFile";
    } else if (conf.target === "texture") {
      targetField = "texture";
    } else if (targetRelativePath.includes("/interface/")) {
      targetField = "extraFile";
    }

    compiledItems.push({
      id: conf.id,
      targetPath: targetRelativePath,
      hash: rttexHash,
      targetField,
      ...(conf.item ? { overrides: conf.item } : {}),
      ...(conf.wiki ? { wiki: conf.wiki } : {}),
    });

    logger.info({ id: conf.id, path: targetRelativePath, field: targetField, hash: rttexHash }, "compiled custom item asset");
  }

  const manifest: CustomItemsManifest = {
    version: 1,
    items: compiledItems,
  };

  const manifestPath = join(cacheDir, "custom-items.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  logger.info({ total: compiledItems.length, manifest: manifestPath }, "custom assets compiled successfully");

  // Merge custom items into .cache/wiki.json
  if (compiledItems.length > 0) {
    await mergeCustomItemsWiki(compiledItems);
  }
}

// Direct CLI execution
if (import.meta.main) {
  buildAssets().catch((err) => {
    logger.error({ err }, "failed to build custom item assets");
    process.exit(1);
  });
}
