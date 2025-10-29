import consola from "consola";
import { readFile, writeFile } from "fs/promises";
import { ItemsDat } from "grow-items";
import { join } from "path";
import { Scraper } from "./scraper";
import { Parser } from "./parser";
import { downloadItemsDat, getLatestItemsDatName } from "../utils";


__dirname = process.cwd();

(async () => {
  const itemsDatName = await getLatestItemsDatName();
  await downloadItemsDat(itemsDatName);

  const ITEMS_DAT_PATH = join(__dirname, ".cache", "growtopia", "dat", itemsDatName);

  const file = await readFile(ITEMS_DAT_PATH);
  const itemsdat = new ItemsDat(Array.from(file));
  await itemsdat.decode();

  const allItems = Array.from(itemsdat.meta.items.values());
  const scraper = new Scraper(allItems);

  const itemPages = await scraper.getItemPages();

  const parser = new Parser(itemPages, allItems);
  const items = await parser.pagesToItems();

  consola.info("Writing ItemsInfo file into ./assets/items_info_new.json");
  writeFile("./assets/items_info_new.json", JSON.stringify(items));


})();




