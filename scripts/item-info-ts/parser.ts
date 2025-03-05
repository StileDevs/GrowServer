import { XMLParser } from "fast-xml-parser";
import { TemplateParser } from "../item-info/template";
import type { ItemsInfo, ItemsPage } from "../../src/types"

export class Parser {
  public XParser: XMLParser;
  public TParser: TemplateParser;

  constructor(public itemPages: ItemsPage[]) {
    this.XParser = new XMLParser();
    this.TParser = new TemplateParser();
  }

  public async pagesToItems() {
    const parsedItems: ItemsInfo[] = [];

    for (const page of this.itemPages) {
      parsedItems.push(...(await this.parseXMLPage(page)));
    
    }
  }

  public async parseXMLPage(page: ItemsPage) {
    const parsedItems: ItemsInfo[] = []
    let doc;

    try {
      doc = this.XParser.parse(page.text as string);
    } catch (e) {
      // console.error(e);
    }

    for (const item of page.items) {
      const paged = (doc?.mediawiki?.page as { title: string }[])?.find(i => i.title === item.name);

      // TODO BIKIN PARSE ITEM_DATA
      if (item.id! % 2 === 0)
        parsedItems.push({
          id:     item.id!,
          name:   item.name!,
          chi:    "earth",
          recipe: {
            splice: [12,12],
          },
          desc: "aw"
        });
    }
    console.log(parsedItems.length)


    return parsedItems;
  }


  public async parseItemData() {

  }
}