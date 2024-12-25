"use strict";

const { ItemsDat } = require("growtopia.js");
const { readFileSync, writeFileSync } = require("fs");
const { get_item_pages } = require("./scraper");
const { pages_to_items } = require("./parser");
const { join } = require("path");
const consola = require("consola");


const ITEMS_DAT_PATH = join(__dirname, "..", "..", "assets", "dat", "items.dat");

async function build(split) {
  consola.info(`Fetching items info ${split} part`);
  const items_dat = new ItemsDat(readFileSync(ITEMS_DAT_PATH));
  await items_dat.decode();

  const item_list = [];

  items_dat.meta.items.forEach((item) => {
    item_list.push({ id: item.id, name: item.name });
  });

  const item_names = item_list.map((item) => item.name);
  const item_pages = await get_item_pages(item_names, split);

  const parsed_items = await pages_to_items(item_pages, item_list);

  writeFileSync("./assets/items_info_new.json", JSON.stringify(parsed_items));
}

build(16);
