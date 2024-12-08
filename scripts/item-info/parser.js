"use strict";

const { parse } = require("mwparser");
const { XMLParser } = require("fast-xml-parser");
const { TemplateParser } = require("./template");

const XParser = new XMLParser();
const template_parser = new TemplateParser();

async function pages_to_items(pages, item_list) {
  const parsed_items = [];

  template_parser.item_list = item_list;
  for (const page of pages) {
    parsed_items.push(...(await parse_xml_page(page)));
  }

  return parsed_items;
}

async function parse_xml_page(page) {
  const page_items_parsed = [];
  const doc = XParser.parse(page);

  for (const page of doc.mediawiki.page) {
    const item_name = page.title;
    const page_text = page.revision.text;
    page_items_parsed.push(parse_item_data(item_name, page_text));
  }

  return page_items_parsed;
}

function parse_item_data(item_name, page_text) {
  let item_data = { id: template_parser.item_list.find((v) => v.name === item_name), name: item_name, recipe: {}, func: {} };
  const parsed_wiki = parse(page_text); // parses wikitext to a nodelist where you can easily filter templates

  for (const template of parsed_wiki.templates) {
    switch (template.name) {
      case "RecipeSplice":
        item_data.recipe.splice = template_parser.splice(template);
        break;
      case "Item":
        [item_data.desc, item_data.chi] = template_parser.item(template);
        break;
      case "Added":
        item_data.func.add = template_parser.func(template);
        break;
      case "Removed":
        item_data.func.rem = template_parser.func(template);
        break;
      // console.log(template.parameters);
      default:
      // console.log(template.name);
    }
  }

  return item_data;
}

module.exports = {
  pages_to_items,
  parse_xml_page,
  parse_item_data
};
