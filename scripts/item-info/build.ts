import consola from "consola";
import { readFile, writeFile } from "fs/promises";
import { ItemsDat } from "growtopia.js";
import { join } from "path";
import { Scraper } from "./scraper";
import { Parser } from "./parser";


const ITEMS_DAT_PATH = join(__dirname, "..", "..", "assets", "dat", "items.dat");



(async() => {
  const file = await readFile(ITEMS_DAT_PATH);
  const itemsdat = new ItemsDat(file);
  await itemsdat.decode();

  const scraper = new Scraper(itemsdat.meta.items);
  
  const itemPages = await scraper.getItemPages();

  const parser = new Parser(itemPages, itemsdat.meta.items);
  const items = await parser.pagesToItems();

  consola.info("Writing ItemsInfo file into ./assets/items_info_new.json");
  writeFile("./assets/items_info_new.json", JSON.stringify(items));
  console.log(items)
})();




