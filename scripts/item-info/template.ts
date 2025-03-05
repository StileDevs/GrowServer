import { ItemDefinition } from "growtopia.js";
import { Template } from "mwparser";

export class TemplateParser {

  public readonly _chi = ["earth", "wind", "fire", "water"];

  constructor(public items: ItemDefinition[]) {}

  public itemIdFromName(item_name: string) {
    const item = this.items.find((item) => item.name === item_name);
    if (item) {
      return Number(item.id);
    } else {
      return 0;
    }
  }

  public splice(t: Template) {
    const ingredients = t.parameters.slice(0, 2).map((ingredient) => String(ingredient.value));
    const ingredient_ids = ingredients.map((ingredient) => this.itemIdFromName(ingredient));
    
    return ingredient_ids;
  }

  public item(t: Template) {
    const desc = t.parameters[0]?.value ?? "No info.";
    const chi = this._chi.includes(t.parameters[1]?.value.toLowerCase()) ? t.parameters[1]?.value.toLowerCase() : "";
    return [desc, chi];
  }
  
  public func(t: Template) {
    return t.parameters[0]?.value
  }
}