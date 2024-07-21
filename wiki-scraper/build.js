import { ItemsDat } from "growtopia.js";
import { readFileSync, writeFileSync } from "fs";
import { get_item_pages } from "./scraper.js";
import { pages_to_items } from "./parser.js";

async function build(split) {
  const items_dat = new ItemsDat(readFileSync("./assets/dat/items.dat"));
  await items_dat.decode();

  const item_list = [];

  items_dat.meta.items.forEach((item) => {
    item_list.push({ id: item.id, name: item.name.value });
  });

  const item_names = item_list.map((item) => item.name);
  const item_pages = await get_item_pages(item_names, split);

  const parsed_items = await pages_to_items(item_pages, item_list);

  writeFileSync("./assets/items_info_new.json", JSON.stringify(parsed_items));
}

await build(16);
