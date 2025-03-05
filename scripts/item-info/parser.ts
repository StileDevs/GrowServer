import { XMLParser } from "fast-xml-parser";
import { TemplateParser } from "./template";
import type { ItemsInfo, ItemsPage } from "../../src/types"
import { ItemDefinition } from "growtopia.js";
import { parse } from "mwparser";

export class Parser {
  public XParser: XMLParser;
  public TParser: TemplateParser;

  constructor(public itemPages: ItemsPage[], private readonly items: ItemDefinition[]) {
    this.XParser = new XMLParser();
    this.TParser = new TemplateParser(this.items);
  }

  public async pagesToItems() {
    const parsedItems: ItemsInfo[] = [];

    for (const page of this.itemPages) {
      parsedItems.push(...(await this.parseXMLPage(page)));
    }

    return parsedItems;
  }

  public async parseXMLPage(page: ItemsPage) {
    const parsedItems: ItemsInfo[] = [];
    let doc;

    try {
      doc = this.XParser.parse(page.text as string);
    } catch (e) {
      // console.error(e);
    }

    for (const item of page.items) {
      const paged = (doc?.mediawiki?.page as { title: string; revision: { text:string } }[])?.find(i => i.title === item.name);
      const pageText = paged?.revision?.text;

      parsedItems.push(await this.parseItemData(item, pageText));
    }
    return parsedItems;
  }


  public async parseItemData(item: ItemDefinition, pageText?: string) {
    const itemData: ItemsInfo = { 
      id:     item.id!,
      name:   item.name!,
      recipe: {
        splice: []
      },
      func: {
        add: "",
        rem: ""
      },
      chi:  "",
      desc: "",
    };

    if (!pageText) return itemData;
    else {
      const parsed_wiki = parse(pageText); // parses wikitext to a nodelist where you can easily filter templates
      
      for (const template of parsed_wiki.templates) {
        switch (template.name) {
          case "RecipeSplice":
            itemData.recipe!.splice = this.TParser.splice(template);
            break;
          case "Item":
            [itemData.desc, itemData.chi as string] = this.TParser.item(template);
            break;
          case "Added":
            itemData.func!.add = this.TParser.func(template);
            break;
          case "Removed":
            itemData.func!.rem = this.TParser.func(template);
            break;
            // console.log(template.parameters);
          default:
            // console.log(template.name);
        }
      }
      return itemData;
    }
  }
}