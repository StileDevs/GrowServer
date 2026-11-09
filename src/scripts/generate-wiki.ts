import { writeFile, readFile, mkdir, access } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import { XMLParser } from "fast-xml-parser";
import { parse, type Template } from "mwparser";
import type { ItemDefinition } from "grow-items";
import { Collection } from "../utils/collection";
import { initItems, items } from "../game/item/item-info";
import { logger } from "../utils/logger";
import { Bucket } from "../utils/bucket";

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

export interface CombineIngredient {
  id: number;
  amount: number;
}

export interface CombineRecipe {
  items: CombineIngredient[];
  resultAmount: number;
}

export interface RecipeInfo {
  splice?: number[];
  combine?: CombineRecipe;
}

export interface FuncInfo {
  add?: string;
  rem?: string;
}

export interface ItemsInfo {
  id: number;
  name: string;
  recipe?: RecipeInfo;
  func?: FuncInfo;
  chi?: string;
  desc?: string;
  playMods?: string[];
}

export interface ItemsPage {
  text: string | null;
  items: ItemDefinition[];
}

export interface ScraperOptions {
  split?: number;
  chunkSize?: number;
  concurrency?: number;
  maxRetries?: number;
  delayMs?: number;
}

/**
 * Parses MediaWiki wikitext templates into structured item metadata.
 */
export class TemplateParser {
  public readonly _chi = ["earth", "wind", "fire", "water"];
  private readonly itemMap = new Collection<string, number>();

  constructor(public items: ItemDefinition[]) {
    for (const item of items) {
      if (item.name && typeof item.id === "number") {
        this.itemMap.set(item.name.toLowerCase().trim(), item.id);
      }
    }
  }

  /**
   * Sanitizes wikitext link wrappers, braces, and excess whitespace.
   */
  public cleanName(val?: string): string {
    if (!val) return "";
    return val
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
      .replace(/[{}\[\]]/g, "")
      .trim();
  }

  public itemIdFromName(itemName: string): number {
    const raw = this.cleanName(itemName).toLowerCase();
    const id = this.itemMap.get(raw);
    if (id !== undefined) return id;

    const targetMatch = itemName.match(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/);
    if (targetMatch && targetMatch[1]) {
      const targetClean = this.cleanName(targetMatch[1]).toLowerCase();
      const targetId = this.itemMap.get(targetClean);
      if (targetId !== undefined) return targetId;
    }

    return 0;
  }

  public splice(t: Template): number[] {
    const ingredients = t.parameters
      .slice(0, 2)
      .map((param) => this.cleanName(String(param.value ?? "")))
      .filter(Boolean);

    return ingredients.map((ing) => {
      const id = this.itemIdFromName(ing);
      if (id === 0) return 0;
      return id % 2 === 0 ? id + 1 : id;
    });
  }

  public combine(t: Template): CombineRecipe | undefined {
    const rawParams = t.parameters
      .map((p) => String(p.value ?? "").trim())
      .filter((v) => v.length > 0);

    if (rawParams.length < 2) {
      return undefined;
    }

    const items: CombineIngredient[] = [];
    let resultAmount = 1;

    let ingredientCount = rawParams.length;
    if (rawParams.length % 2 !== 0) {
      const lastVal = this.cleanName(rawParams[rawParams.length - 1]);
      const parsedAmount = parseInt(lastVal, 10);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        resultAmount = parsedAmount;
        ingredientCount = rawParams.length - 1;
      }
    }

    for (let i = 0; i < ingredientCount; i += 2) {
      const rawName = rawParams[i];
      const rawCount = rawParams[i + 1];
      if (!rawName) continue;

      const id = this.itemIdFromName(rawName);
      if (id === 0) continue;

      const cleanedCount = this.cleanName(rawCount);
      const amount = Math.max(1, parseInt(cleanedCount, 10) || 1);
      items.push({ id, amount });
    }

    if (items.length === 0) {
      return undefined;
    }

    return {
      items,
      resultAmount,
    };
  }

  public item(t: Template): [string, string] {
    const desc = t.parameters[0]?.value ? String(t.parameters[0].value).trim() : "No info.";
    const rawChi = t.parameters[1]?.value ? String(t.parameters[1].value).toLowerCase().trim() : "";
    const chi = this._chi.includes(rawChi) ? rawChi : "";
    return [desc, chi];
  }

  public func(t: Template): string {
    return t.parameters[0]?.value ? String(t.parameters[0].value).trim() : "";
  }

  public playMods(t: Template): string[] {
    const mods: string[] = [];

    for (const param of t.parameters) {
      const val = String(param.value ?? "").trim();
      if (val) {
        mods.push(val);
      }
    }

    return mods;
  }
}

/**
 * Parses MediaWiki XML export and converts wikitext pages into ItemsInfo records.
 */
export class Parser {
  public xParser: XMLParser;
  public tParser: TemplateParser;

  constructor(
    public itemPages: ItemsPage[],
    private readonly items: ItemDefinition[],
  ) {
    this.xParser = new XMLParser({
      isArray: (name) => name === "page",
      ignoreAttributes: true,
    });
    this.tParser = new TemplateParser(this.items);
  }

  public async pagesToItems(): Promise<ItemsInfo[]> {
    const parsedItems: ItemsInfo[] = [];

    for (const page of this.itemPages) {
      const results = await this.parseXMLPage(page);
      parsedItems.push(...results);
    }

    return parsedItems;
  }

  public async parseXMLPage(page: ItemsPage): Promise<ItemsInfo[]> {
    const parsedItems: ItemsInfo[] = [];
    if (!page.text) {
      for (const item of page.items) {
        parsedItems.push(this.createEmptyItemData(item));
      }
      return parsedItems;
    }

    const pageMap = new Collection<string, string>();
    try {
      const doc = this.xParser.parse(page.text) as {
        mediawiki?: {
          page?: Array<{ title?: string; revision?: { text?: string | { "#text"?: string } } }>;
        };
      };

      const pages = doc?.mediawiki?.page || [];
      for (const p of pages) {
        const title = p?.title?.trim().toLowerCase();
        const rawText = p?.revision?.text;
        const text = typeof rawText === "string" ? rawText : (rawText?.["#text"] ?? "");
        if (title) {
          pageMap.set(title, text);
        }
      }
    } catch {
      // Ignored: fallback to empty data on XML parse error
    }

    for (const item of page.items) {
      const pageText = item.name ? pageMap.get(item.name.toLowerCase().trim()) : undefined;
      parsedItems.push(await this.parseItemData(item, pageText));
    }

    return parsedItems;
  }

  public createEmptyItemData(item: ItemDefinition): ItemsInfo {
    return {
      id: item.id ?? 0,
      name: item.name ?? "",
      recipe: {
        splice: [],
      },
      func: {
        add: "",
        rem: "",
      },
      chi: "",
      desc: "",
    };
  }

  public async parseItemData(item: ItemDefinition, pageText?: string): Promise<ItemsInfo> {
    const itemData: ItemsInfo = this.createEmptyItemData(item);

    if (!pageText) return itemData;

    try {
      const parsedWiki = parse(pageText);

      for (const template of parsedWiki.templates) {
        const name = template.name.toLowerCase().trim();

        switch (name) {
          case "item/mod":
            itemData.playMods = this.tParser.playMods(template);
            break;
          case "recipesplice":
            itemData.recipe!.splice = this.tParser.splice(template);
            break;
          case "recipecombine":
          case "tablerecipecombine": {
            const combineRecipe = this.tParser.combine(template);
            if (combineRecipe) {
              itemData.recipe!.combine = combineRecipe;
            }
            break;
          }
          case "item":
            [itemData.desc, itemData.chi] = this.tParser.item(template);
            break;
          case "added":
            itemData.func!.add = this.tParser.func(template);
            break;
          case "removed":
            itemData.func!.rem = this.tParser.func(template);
            break;
        }
      }
    } catch {
      // Ignore template parse error for malformed wikitext
    }

    return itemData;
  }
}

/**
 * Scrapes Growtopia Fandom Wiki Special:Export in concurrent batches.
 */
export class Scraper {
  public readonly chunkSize: number;
  public readonly maxRetries: number;
  public readonly bucket: Bucket;

  constructor(
    public items: ItemDefinition[],
    options: ScraperOptions = {},
  ) {
    this.chunkSize = options.chunkSize ?? 50;
    this.maxRetries = options.maxRetries ?? 5;
    // Token bucket rate limiter: 4 requests per 1000ms
    this.bucket = new Bucket(4, 1000);
  }

  public splitItems(): ItemDefinition[][] {
    const validItems = this.items.filter(
      (it) =>
        typeof it.id === "number" &&
        it.id % 2 === 0 &&
        it.name &&
        it.name !== "Blank" &&
        !it.name.toLowerCase().includes("null_item") &&
        it.name.trim() !== "",
    );
    const sublists: ItemDefinition[][] = [];

    for (let i = 0; i < validItems.length; i += this.chunkSize) {
      sublists.push(validItems.slice(i, i + this.chunkSize));
    }

    return sublists;
  }

  public async getItemPages(): Promise<ItemsPage[]> {
    const sublists = this.splitItems();
    logger.info({ totalItems: this.items.length, chunks: sublists.length }, "starting wiki scraper for items");

    const promises = sublists.map((sublist, idx) => this.postRequestWithRetry(sublist, idx + 1, sublists.length));

    const results = await Promise.all(promises);
    logger.info({ totalPages: results.length }, "fetching items info complete");
    return results;
  }

  public async postRequestWithRetry(items: ItemDefinition[], chunkIndex: number, totalChunks: number): Promise<ItemsPage> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const result = await this.bucket.execute(() => this.postRequest(items, chunkIndex, totalChunks), attempt > 1);

        if (result.text !== null) {
          return result;
        }

        // If rate limited (429), pause the bucket and back off
        if (result.status?.includes("429")) {
          const waitTime = Math.max(5000, attempt * 4000);
          logger.warn({ chunk: chunkIndex, attempt, waitMs: waitTime }, "rate limited by wiki api (429), pausing bucket");
          this.bucket.tokens = this.bucket.tokenLimit;
          this.bucket.lastReset = Date.now() + waitTime;
          await new Promise((r) => setTimeout(r, waitTime));
        }
      } catch (err) {
        logger.warn({ chunk: chunkIndex, attempt, err: String(err) }, "wiki request failed, retrying");
        await new Promise((r) => setTimeout(r, Math.min(1500 * Math.pow(2, attempt), 8000)));
      }
    }

    logger.error({ chunk: chunkIndex }, "failed all retries for wiki chunk");
    return { text: null, items };
  }

  public async postRequest(items: ItemDefinition[], chunkIndex: number, totalChunks: number): Promise<ItemsPage & { status?: string }> {
    const names = items.map((i) => i.name!.trim()).filter(Boolean);
    const titles = names.join("|");
    const [text, status] = await this.fetchWiki(titles);

    if (text !== null) {
      if (chunkIndex % 50 === 0 || chunkIndex === totalChunks) {
        logger.info({ chunk: chunkIndex, total: totalChunks, status }, "wiki chunk fetched successfully");
      }
    } else {
      logger.warn({ chunk: chunkIndex, total: totalChunks, status }, "wiki chunk returned non-200 status");
    }

    return {
      text,
      items,
      status,
    };
  }

  private async fetchWiki(titles: string): Promise<[string | null, string]> {
    try {
      const url = `https://growtopia.fandom.com/api.php?action=query&export=1&exportnowrap=1&titles=${encodeURIComponent(titles)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      if (!response.ok) {
        return [null, `${response.status} ${response.statusText}`];
      }

      const text = await response.text();
      if (!text.includes("<mediawiki") && !text.includes("<page>")) {
        return [null, "invalid mediawiki xml response"];
      }

      return [text, `${response.status} OK`];
    } catch (error) {
      return [null, error instanceof Error ? error.message : String(error)];
    }
  }
}

/**
 * Builds wiki.json by scraping Growtopia Wiki Special:Export.
 */
export async function buildItemsInfo(outputPath?: string, options: { force?: boolean } = {}): Promise<void> {
  const startTime = performance.now();
  const targetPath = outputPath || join(process.cwd(), ".cache", "wiki.json");

  // Check if wiki.json already exists with valid data
  if (!options.force && (await fileExists(targetPath))) {
    try {
      const existingRaw = await readFile(targetPath, "utf-8");
      const existingItems = JSON.parse(existingRaw);
      if (Array.isArray(existingItems) && existingItems.length > 0) {
        logger.info({ path: targetPath, count: existingItems.length }, "existing wiki metadata detected, skipping scrape");
        // Ensure custom items are merged into existing wiki.json
        try {
          const { buildAssets } = await import("./build-assets");
          await buildAssets();
        } catch (err) {
          logger.warn({ err }, "failed to merge custom items into wiki.json");
        }
        return;
      }
    } catch {}
  }

  logger.info("initializing items.dat for wiki generation...");
  await initItems();

  const allItems = Array.from(items.meta.items.values());
  logger.info({ count: allItems.length }, "items loaded, initializing scraper");

  const scraper = new Scraper(allItems, { chunkSize: 50, maxRetries: 5 });
  const itemPages = await scraper.getItemPages();

  logger.info("parsing wiki pages and wikitext templates...");
  const parser = new Parser(itemPages, allItems);
  const parsedItems = await parser.pagesToItems();

  await mkdir(join(process.cwd(), ".cache"), { recursive: true });
  await writeFile(targetPath, JSON.stringify(parsedItems, null, 2), "utf-8");

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  logger.info({ path: targetPath, count: parsedItems.length, elapsed: `${elapsed}s` }, "wiki.json generated successfully");

  // Merge custom items into .cache/wiki.json if available
  try {
    const { buildAssets } = await import("./build-assets");
    await buildAssets();
  } catch (err) {
    logger.warn({ err }, "failed to merge custom items into wiki.json");
  }
}

if (import.meta.main) {
  const force = process.argv.includes("--force");
  buildItemsInfo(undefined, { force })
    .then(() => {
      logger.info("wiki generation process completed");
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, "wiki generation failed with error");
      process.exit(1);
    });
}
