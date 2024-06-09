import cheerio from "cheerio";
import { readFileSync, writeFileSync } from "fs";
import { ItemsDat } from "growtopia.js";
import axios from "axios";

const lastItem = JSON.parse(readFileSync("./assets/items_info.json").toString()) || [];
let count = 1;
// let temp = [];

async function writeAll() {
  console.log(`Saved ${lastItem.length} items`);
  await writeFileSync("./assets/items_info.json", JSON.stringify(lastItem.sort((a, b) => a - b)));
  process.exit();
}

(async () => {
  const itemsDat = new ItemsDat(readFileSync("./assets/dat/items.dat"));
  await itemsDat.decode();

  console.log(`Continue last saved ${lastItem.length} items`);
  for (let i = itemsDat.meta.items[lastItem.length].id * 2; i < itemsDat.meta.items.length; i++) {
    if (i % 2 === 1) continue;
    const url = `https://growtopia.fandom.com/wiki/${encodeURIComponent(itemsDat.meta.items[i].name.value)}`;

    console.time(`${count}. [${itemsDat.meta.items[i].id}] ${itemsDat.meta.items[i].name.value}`);

    await axios
      .get(url)
      .then((res) => {
        const $ = cheerio.load(res.data);

        const description = $(".card-text").first().text() || null;
        const properties =
          $("#mw-content-text > div > div.gtw-card.item-card > div:nth-child(4)")
            .text()
            .trim()
            .split(/[\.+\!]/)
            .filter((d) => d !== "") || null;
        const sprite = $(".growsprite > img").attr("src") || null;
        const chi = $("#mw-content-text > div.mw-parser-output > div.gtw-card.item-card > table > tbody > tr:nth-child(2) > td").text().trim() || null;
        const gemsDrop = $("#mw-content-text > div.mw-parser-output > div.gtw-card.item-card > table > tbody > tr:nth-child(8) > td").text().replace(/ /g, "") || null;
        const playMod = $("#mw-content-text > div.mw-parser-output > p:nth-child(8) > i").text() || $("#mw-content-text > div.mw-parser-output > p:nth-child(9) > a:nth-child(1)").text() || $("#mw-content-text > div.mw-parser-output > p:nth-child(8) > a:nth-child(1)").text() || null;

        const splice = [$("#mw-content-text > div.mw-parser-output > div > table > tbody > tr:nth-child(3) > td > a:nth-child(2)").text() || null, $("#mw-content-text > div.mw-parser-output > div > table > tbody > tr:nth-child(3) > td > a:nth-child(5)").text() || null];
        const recipe =
          $(".recipebox table.content")
            .last()
            .text()
            .trim()
            .split(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/)
            .map((e) => e.trim()) || null;
        const info = $("#mw-content-text > div > p:nth-child(3)").text().trim() || null;
        const type = $("table.card-field tr:nth-child(1) > td").text().split(" ").pop() || null;
        const itemFunction = Array.from($('#mw-content-text > div.mw-parser-output > table[width="600"] > tbody > tr > td').map((i, el) => cheerio.load(el).text().trim() || null)) || null;

        lastItem.push({
          id: itemsDat.meta.items[i].id,
          description,
          info,
          properties: properties?.length > 0 ? properties : null,
          type,
          sprite,
          chi,
          playMod,
          gemsDrop,
          recipe:
            recipe?.length > 0
              ? {
                  type: recipe.shift() || "",
                  recipe: recipe
                }
              : null,
          itemFunction,
          splice: splice?.length > 0 ? splice : null
        });
        console.timeEnd(`${count}. [${itemsDat.meta.items[i].id}] ${itemsDat.meta.items[i].name.value}`);
        count++;
      })
      .catch((err) => {
        console.log(`err: [${itemsDat.meta.items[i].id}] ${itemsDat.meta.items[i].name.value}`, err.code, err.message);
        lastItem.push({
          id: itemsDat.meta.items[i].id,
          description: null,
          info: null,
          properties: null,
          type: null,
          sprite: null,
          chi: null,
          playMod: null,
          gemsDrop: null,
          recipe: null,
          itemFunction: null,
          splice: null
        });
      });
  }
  console.log("Done");

  // writeFileSync("./items_info.json", JSON.stringify(temp.sort((a, b) => a - b)));
  writeAll();
})();

process.on("SIGINT", () => writeAll());
process.on("SIGQUIT", () => writeAll());
process.on("SIGTERM", () => writeAll());
