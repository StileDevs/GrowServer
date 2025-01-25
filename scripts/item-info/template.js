/* eslint-disable no-undef */
"use strict";

class TemplateParser {
  constructor(item_list = []) {
    this._item_list = item_list;
    this._chi = ["earth", "wind", "fire", "water"];
  }

  itemIdFromName(item_name) {
    const item = this._item_list.find((item) => item.name === item_name);
    if (item) {
      return Number(item.id);
    } else {
      return 0;
    }
  }

  get item_list() {
    return this._item_list;
  }

  set item_list(new_item_list) {
    this._item_list = new_item_list;
  }

  splice(t) {
    const ingredients = t.parameters.slice(0, 2).map((ingredient) => String(ingredient.value));
    const ingredient_ids = ingredients.map((ingredient) => this.itemIdFromName(ingredient));
    return ingredient_ids;
  }

  item(t) {
    // console.log(`TEMPLATNAME ${t.name}`);
    const desc = t.parameters[0]?.value ?? "No info.";
    const chi = this._chi.includes(t.parameters[1]?.value.toLowerCase()) ? t.parameters[1]?.value.toLowerCase() : "";
    return [desc, chi];
  }

  func(t) {
    return t.parameters[0]?.value;
  }
}

module.exports = {
  TemplateParser
};
