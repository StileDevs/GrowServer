import consola from "consola";
import { readFile } from "fs/promises";
import { ItemsDat } from "growtopia.js";
import { join } from "path";
import { Scraper } from "./scraper";
import { Parser } from "./parser";
import { ItemDefinition } from "growtopia.js";
import type { ItemsPage } from "../../src/types"


const ITEMS_DAT_PATH = join(__dirname, "..", "..", "assets", "dat", "items.dat");




(async() => {
  const file = await readFile(ITEMS_DAT_PATH);
  const itemsdat = new ItemsDat(file);
  await itemsdat.decode();



  const scraper = new Scraper(itemsdat.meta.items);
  const itemPages = await scraper.getItemPages();

  const parser = new Parser(itemPages);
  parser.pagesToItems();


})();




