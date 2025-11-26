import { ItemDefinition } from "grow-items";
import type { ItemsPage } from "@growserver/types";
import logger from "@growserver/logger";

export class Scraper {
  constructor(
    public items: ItemDefinition[],
    public readonly split = 16,
  ) {}

  public async splitItems() {
    const sublistSize = Math.ceil(this.items.length / this.split);

    const sublists: ItemDefinition[] = [];

    for (let i = 0; i < this.items.length; i += sublistSize) {
      sublists.push(this.items.slice(i, i + sublistSize));
    }

    return sublists as ItemDefinition[][];
  }

  public async getItemPages() {
    const sublists = await this.splitItems();

    const tasks = sublists.map((sublist, i) =>
      this.postRequest(sublist, i + 1),
    );
    const results = await Promise.all(tasks);

    logger.info("fetching items info complete.");

    return results as ItemsPage[];
  }

  public async postRequest(items: ItemDefinition[], iterateNum: number) {
    logger.info(`ItemsInfo part ${iterateNum}, starting post request`);

    const names = items.map((i) => i.name);
    const postData = new URLSearchParams({
      title: "Special:Export",
      pages: names.join("\n"),
      curonly: "1",
    });

    const [text, status] = await this.fetchWiki(postData);

    if (text !== null) {
      logger.info(`ItemsInfo part ${iterateNum}, status: ${status}`);
    } else {
      logger.error(`ItemsInfo part ${iterateNum}, status: ${status}`);
    }

    const result = {
      text,
      items,
    };
    return result;
  }

  private async fetchWiki(postData: URLSearchParams) {
    const response = await fetch(
      "https://growtopia.fandom.com/wiki/Special:Export",
      {
        method: "POST",
        body: postData,
      },
    );

    if (response.status !== 200) return [null, response.statusText];

    const text = await response.text();

    return [text, response.statusText];
  }
}
