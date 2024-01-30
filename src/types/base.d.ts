export interface WikiItems {
  id: number;
  description: string | null;
  properties: string[] | null;
  type: string | null;
  sprite: string | null;
  chi: string | null;
  playMod: string | null;
  gemsDrop: string | null;
  recipe: {
    type: string | null | undefined;
    recipe: string[] | null | undefined;
  } | null;
  splice: string | null;
  itemFunction: string[];
}
