const cheerio = require("cheerio");
const { readFileSync, writeFileSync } = require("fs");
const { ItemsDat } = require("growtopia.js");
const axios = require("axios").default;

const lastItem = JSON.parse(readFileSync("./assets/items_info.json").toString()) || [];
let count = 1;
// let temp = [];

async function writeAll() {
  console.log(`Saved ${lastItem.length} items`);
  await writeFileSync("./assets/items_info.json", JSON.stringify(lastItem.sort((a, b) => a - b)));
  process.exit();
}

(async () => {
  const items = await new ItemsDat(readFileSync("./assets/dat/items.dat")).decode();

  console.log(`Continue last saved ${lastItem.length} items`);
  for (let i = items.items[lastItem.length].id * 2; i < items.items.length; i++) {
    if (i % 2 === 1) continue;
    const url = `https://growtopia.fandom.com/wiki/${encodeURIComponent(items.items[i].name)}`;

    console.time(`${count}. [${items.items[i].id}] ${items.items[i].name}`);

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
          id: items.items[i].id,
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
        console.timeEnd(`${count}. [${items.items[i].id}] ${items.items[i].name}`);
        count++;
      })
      .catch((err) => {
        console.log(`err: [${items.items[i].id}] ${items.items[i].name}`, err.code, err.message);
        lastItem.push({
          id: items.items[i].id,
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
