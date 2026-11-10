/**
 * Data tables and constants for the Growtopia cooking systems:
 * - Timed Cooking Ovens (Home Oven, Commercial Oven, Master Chef's Oven, Replicator, Taco Truck Oven)
 * - Food Grinder (4582)
 * - Cutting Board (3470) + Butcher Knife (4506) / Sushi Knife (3466)
 * - E-Z Cook Oven / Chemical Combiner overrides
 * - Sales-Man Cooking Store (53785) & Mac n' Cheese Stars (4612 / 4614)
 */

// --- Oven blocks & extra data ------------------------------------------------

export const EZ_COOK_OVEN = 952;
export const COMMERCIAL_OVEN = 4498;
export const HOME_OVEN = 4618;
export const MASTER_CHEFS_OVEN = 4620;
export const REPLICATOR = 6412;
export const TACO_TRUCK_OVEN = 10820;

export const OVEN_EXTRA_TYPE = 55;

export const OVEN_ITEM_IDS: ReadonlySet<number> = new Set([
  COMMERCIAL_OVEN,
  HOME_OVEN,
  MASTER_CHEFS_OVEN,
  REPLICATOR,
  TACO_TRUCK_OVEN,
]);

/** Server heat multipliers; the client's integer heat rate is three times this value. */
export const OVEN_HEAT = {
  OFF: 0,
  LOW: 1,
  MED: 2,
  HIGH: 3,
} as const;

export type OvenHeatLevel = (typeof OVEN_HEAT)[keyof typeof OVEN_HEAT];

// --- Prep blocks, tools & special items --------------------------------------

export const FOOD_GRINDER = 4582;
export const CUTTING_BOARD = 3470;
export const BUTCHER_KNIFE = 4506;
export const SUSHI_KNIFE = 3466;
export const EXQUISITE_ROLLING_PIN = 7310;

export const ROLLING_PIN_IDS: ReadonlySet<number> = new Set([
  7306, // Anomalizing Reliable Rolling Pin
  7308, // Anomalizing Pristine Rolling Pin
  7310, // Exquisite Rolling Pin
  7312, // Anomalizing Elegant Rolling Pin
]);

export const SALSA = 4560;
export const FLOUR = 4562;
export const LETTUCE = 4564;
export const SALT = 4568;
export const PEPPER = 4570;
export const SUGAR = 4572;
export const DISGUSTING_MESS = 4574;
export const BLAND_MUSH = 4576;
export const BEEF = 4578;
export const GROUND_BEEF = 4580;
export const BACON = 4586;
export const CHICKEN_MEAT = 4588;
export const ONION = 4602;
export const BAKING_CHOCOLATE = 4610;
export const MAC_N_CHEESE_STAR = 4612;
export const PLETHORA_MAC_N_CHEESE_STARS = 4614;
export const CORN_MEAL = 4670;
export const FISH_CHUNK = 3468;
export const WATER_BUCKET = 822;

/** Spices that can be added to a running oven at any time. */
export const OVEN_SPICES: ReadonlySet<number> = new Set([SALT, PEPPER, SUGAR]);

// --- Food Grinder recipes (ItsKyy / v8 Base.h parity) ------------------------

export interface GrindRecipe {
  /** Number of input items consumed per 1 output item. */
  count: number;
  /** Resulting ground item ID. */
  prize: number;
}

export const GRINDABLE_ITEMS: Readonly<Record<number, GrindRecipe>> = {
  326: { count: 30, prize: 4586 },   // Magic Bacon Wallpaper -> Bacon
  4422: { count: 20, prize: 4610 },  // Chocolate Heart -> Baking Chocolate
  2564: { count: 20, prize: 4610 },  // Chocolate Block -> Baking Chocolate
  2566: { count: 20, prize: 4610 },  // Dark Chocolate Block -> Baking Chocolate
  5372: { count: 20, prize: 4610 },  // White Chocolate Block -> Baking Chocolate
  6956: { count: 1, prize: 6958 },   // Beat-root Block -> Beat-root Puree
  6972: { count: 5, prize: 6974 },   // Toffee Block -> Caramel
  7002: { count: 12, prize: 7004 },  // Quantum Starfish -> Chrono-Luminescent Liquid
  7050: { count: 20, prize: 7054 },  // Coconut -> Coconut Milk
  4668: { count: 50, prize: 4670 },  // Corn -> Corn Meal
  7012: { count: 1, prize: 7014 },   // Encapsulated Galaxy -> Cosmic 5-Spice Star
  440: { count: 100, prize: 6314 },  // Ice -> Crushed Ice
  880: { count: 50, prize: 4562 },   // Wheat -> Flour
  5348: { count: 100, prize: 5416 }, // Gingerbread Block -> Gingerbread Dough
  5350: { count: 100, prize: 5416 }, // Gingerbread House -> Gingerbread Dough
  5352: { count: 100, prize: 5416 }, // Gingerbread Roof -> Gingerbread Dough
  5354: { count: 100, prize: 5416 }, // Gingerbread Door -> Gingerbread Dough
  4578: { count: 1, prize: 4580 },   // Beef -> Ground Beef
  7460: { count: 25, prize: 7462 },  // Nutmeg Block -> Ground Nutmeg
  192: { count: 50, prize: 4564 },   // Bush -> Lettuce
  1004: { count: 50, prize: 4564 },  // Hedge -> Lettuce
  4982: { count: 100, prize: 4984 }, // Orange -> Orange Juice
  4584: { count: 100, prize: 4570 }, // Pepper Tree -> Pepper
  712: { count: 1, prize: 4570 },    // Habanero Pepper -> Pepper
  960: { count: 1, prize: 4570 },    // Habanero Cheese Bread -> Pepper
  2734: { count: 50, prize: 4764 },  // Pineapple -> Pineapple Slice
  6988: { count: 10, prize: 6990 },  // Primordial Ooze -> Primordial Soup
  4566: { count: 100, prize: 4568 }, // Salt Block -> Salt
  6998: { count: 2, prize: 7000 },   // Mint -> Sprig of Mint
  3404: { count: 20, prize: 4572 },  // Sour Lollipop -> Sugar
  3836: { count: 20, prize: 4572 },  // Honey -> Sugar
  3406: { count: 10, prize: 4572 },  // Sweet Lollipop -> Sugar
  954: { count: 100, prize: 4572 },  // Sugar Cane -> Sugar
  10268: { count: 3, prize: 10272 }, // Sweet Potato -> Sweet Potato Mash
};

// --- E-Z Cook Oven / Chemical Combiner explicit recipes ----------------------

export interface CombineRecipe {
  resultId: number;
  resultAmount: number;
  items: ReadonlyArray<{ id: number; amount: number }>;
}

/**
 * Explicit combine recipes for E-Z Cook Oven / Chemical Combiner where `.cache/wiki.json`
 * scraped a downstream usage table instead of the item's own creation recipe.
 */
export const EXPLICIT_COMBINE_RECIPES: readonly CombineRecipe[] = [
  // Dough: 4x Wheat + 1x Egg + 1x Sugar Cane -> 1x Dough
  { resultId: 956, resultAmount: 1, items: [{ id: 880, amount: 4 }, { id: 874, amount: 1 }, { id: 954, amount: 1 }] },
  // Dough (alt with Flour & Sugar): 4x Flour + 1x Egg + 1x Sugar -> 1x Dough
  { resultId: 956, resultAmount: 1, items: [{ id: 4562, amount: 4 }, { id: 874, amount: 1 }, { id: 4572, amount: 1 }] },
  // Bread: 1x Dough + 1x Egg + 1x Milk -> 1x Bread
  { resultId: 950, resultAmount: 1, items: [{ id: 956, amount: 1 }, { id: 874, amount: 1 }, { id: 868, amount: 1 }] },
  // Blueberry Muffin: 6x Blueberry + 2x Dough + 2x Sugar Cane -> 1x Blueberry Muffin
  { resultId: 958, resultAmount: 1, items: [{ id: 196, amount: 6 }, { id: 956, amount: 2 }, { id: 954, amount: 2 }] },
  // Habanero Cheese Bread: 1x Habanero Pepper + 4x Dough + 1x Swiss Cheese Block -> 1x Habanero Cheese Bread
  { resultId: 960, resultAmount: 1, items: [{ id: 712, amount: 1 }, { id: 956, amount: 4 }, { id: 664, amount: 1 }] },
  // Pizza: 3x Dough + 1x Tomato + 1x Swiss Cheese Block -> 1x Pizza
  { resultId: 964, resultAmount: 1, items: [{ id: 956, amount: 3 }, { id: 962, amount: 1 }, { id: 664, amount: 1 }] },
  // Pizza (4x Dough variant): 4x Dough + 1x Tomato + 1x Swiss Cheese Block -> 1x Pizza
  { resultId: 964, resultAmount: 1, items: [{ id: 956, amount: 4 }, { id: 962, amount: 1 }, { id: 664, amount: 1 }] },
  // Apple Pie: 2x Apple + 3x Dough + 2x Sugar Cane -> 1x Apple Pie
  { resultId: 966, resultAmount: 1, items: [{ id: 676, amount: 2 }, { id: 956, amount: 3 }, { id: 954, amount: 2 }] },
  // Cheeseburger: 1x Cow + 2x Bread + 1x Swiss Cheese Block -> 1x Cheeseburger
  { resultId: 968, resultAmount: 1, items: [{ id: 866, amount: 1 }, { id: 950, amount: 2 }, { id: 664, amount: 1 }] },
  // Nigiri Sushi: 10x Rice + 3x Fish Chunk + 1x Seaweed -> 1x Nigiri Sushi
  { resultId: 3474, resultAmount: 1, items: [{ id: 3472, amount: 10 }, { id: 3468, amount: 3 }, { id: 846, amount: 1 }] },
  // Fish And Chips: 1x Potato + 2x Fish Chunk + 3x Wheat -> 1x Fish And Chips
  { resultId: 3546, resultAmount: 1, items: [{ id: 3428, amount: 1 }, { id: 3468, amount: 2 }, { id: 880, amount: 3 }] },
  // Fish Taco: 2x Wheat + 3x Fish Chunk + 1x Swiss Cheese Block -> 1x Fish Taco
  { resultId: 3600, resultAmount: 1, items: [{ id: 880, amount: 2 }, { id: 3468, amount: 3 }, { id: 664, amount: 1 }] },
  // Tamago Sushi: 1x Seaweed + 3x Egg + 10x Rice -> 1x Tamago Sushi
  { resultId: 3816, resultAmount: 1, items: [{ id: 846, amount: 1 }, { id: 874, amount: 3 }, { id: 3472, amount: 10 }] },
  // Gruel: 2x Wheat + 2x Rice + 1x Water Bucket -> 1x Gruel
  { resultId: 4410, resultAmount: 1, items: [{ id: 880, amount: 2 }, { id: 3472, amount: 2 }, { id: 822, amount: 1 }] },
];

// --- Timed Oven Recipes (Guide:Cooking) --------------------------------------

export interface OvenRecipeIngredient {
  /** Ingredient item ID (note: 4560 Salsa can be formed by Tomato 962 + Habanero Pepper 712 or Onion 4602). */
  id: number;
  /** Ideal addition time in Low Heat seconds (-1 means anytime during cooking). */
  timeSec: number;
  /** Whether this ingredient is optional in recipe matching. */
  optional?: boolean;
}

export interface OvenRecipe {
  /** Primary dish item ID produced. */
  resultId: number;
  /** Dish display name. */
  name: string;
  /** Total ideal cook duration in Low Heat seconds. */
  durationSec: number;
  /** Minimum Chef Role level required (1 = everyone). */
  minChefLevel?: number;
  /** Required (and optional) ingredients with their Low Heat addition times. */
  ingredients: readonly OvenRecipeIngredient[];
  /** Ideal spice counts (Salt 4568, Pepper 4570, Sugar 4572). */
  spices: Readonly<{
    salt?: number;
    pepper?: number;
    sugar?: number;
  }>;
  /** Optional quality-based result override (e.g. Magnifico Carne Guacamole Bueno/Sabroso/Perfecto). */
  qualityVariants?: ReadonlyArray<{ minQuality: number; itemId: number }>;
  /** Optional bonus item awarded at >= 95% quality (e.g. Gingerbread Man 5414). */
  perfectBonusItemId?: number;
}

/**
 * All official Growtopia timed oven recipes (timings in Low Heat seconds).
 * Medium heat divides timings by 2; High heat divides timings by 3.
 */
export const OVEN_RECIPES: readonly OvenRecipe[] = [
  {
    resultId: 4596,
    name: "Berry Crepes",
    durationSec: 60,
    ingredients: [
      { id: 4562, timeSec: 0 },    // Flour
      { id: 874, timeSec: 0 },     // Egg
      { id: 868, timeSec: 26.7 },  // Milk
      { id: 196, timeSec: 40 },    // Blueberry
    ],
    spices: { sugar: 2 },
  },
  {
    resultId: 4594,
    name: "Apple Strudel",
    durationSec: 83,
    ingredients: [
      { id: 676, timeSec: 0 },     // Apple
      { id: 3836, timeSec: -1, optional: true }, // Honey (anytime)
      { id: 956, timeSec: 23.3 },  // Dough
      { id: 874, timeSec: 23.3 },  // Egg
    ],
    spices: { salt: 1, sugar: 2 },
  },
  {
    resultId: 1474,
    name: "Eggs Benedict",
    durationSec: 60,
    ingredients: [
      { id: 956, timeSec: 0 },     // Dough
      { id: 874, timeSec: 0 },     // Egg
      { id: 4586, timeSec: 10 },   // Bacon
      { id: 868, timeSec: 26 },    // Milk
    ],
    spices: { salt: 1 },
  },
  {
    resultId: 4604,
    name: "Arroz Con Pollo",
    durationSec: 100,
    ingredients: [
      { id: 3472, timeSec: 0 },    // Rice
      { id: 822, timeSec: 0, optional: true }, // Water Bucket
      { id: 4602, timeSec: 33.7 }, // Onion
      { id: 4588, timeSec: 33.7 }, // Chicken Meat
      { id: 962, timeSec: 70 },    // Tomato
    ],
    spices: { salt: 1, pepper: 2 },
  },
  {
    resultId: 4598,
    name: "BBQ Bacon Burger",
    durationSec: 66,
    ingredients: [
      { id: 4580, timeSec: 0 },    // Ground Beef
      { id: 956, timeSec: 6.3 },   // Dough
      { id: 4586, timeSec: 16.3 }, // Bacon
      { id: 962, timeSec: 36.3 },  // Tomato
      { id: 4564, timeSec: 65 },   // Lettuce
    ],
    spices: { salt: 1, pepper: 1, sugar: 1 },
  },
  {
    resultId: 4600,
    name: "Beer-Battered Fish And Chips",
    durationSec: 120,
    ingredients: [
      { id: 540, timeSec: 0 },     // Green Beer
      { id: 4562, timeSec: 0 },    // Flour
      { id: 3428, timeSec: 0 },    // Potato
      { id: 3468, timeSec: 87 },   // Fish Chunk
    ],
    spices: { salt: 1, pepper: 1 },
  },
  {
    resultId: 4592,
    name: "Homemade Fish Taco",
    durationSec: 60,
    ingredients: [
      { id: 4560, timeSec: 0 },    // Salsa (Tomato + Habanero Pepper/Onion)
      { id: 956, timeSec: 0 },     // Dough
      { id: 3468, timeSec: 26.5 }, // Fish Chunk
      { id: 664, timeSec: 49, optional: true }, // Swiss Cheese Block
      { id: 4564, timeSec: 57 },   // Lettuce
    ],
    spices: { salt: 1, pepper: 1 },
  },
  {
    resultId: 4674,
    name: "Chips And Guacamole",
    durationSec: 66,
    ingredients: [
      { id: 4560, timeSec: 0 },    // Salsa (Tomato + Habanero Pepper/Onion)
      { id: 822, timeSec: 0, optional: true }, // Water Bucket
      { id: 4670, timeSec: 0 },    // Corn Meal
      { id: 4666, timeSec: 65 },   // Lemon
      { id: 4672, timeSec: 65 },   // Avocado
    ],
    spices: { salt: 2 },
  },
  {
    resultId: 4768,
    name: "Pineapple Turnover",
    durationSec: 83,
    ingredients: [
      { id: 4764, timeSec: 0 },    // Pineapple Slice
      { id: 956, timeSec: 23 },    // Dough
      { id: 3622, timeSec: 43 },   // Pineapple Daiquiri
      { id: 4766, timeSec: 73 },   // Cherry
    ],
    spices: { sugar: 2 },
  },
  {
    resultId: 5452,
    name: "Gingerbread Cookie",
    durationSec: 80,
    ingredients: [
      { id: 5416, timeSec: 0 },    // Gingerbread Dough
      { id: 3836, timeSec: -1, optional: true }, // Honey
      { id: 874, timeSec: 20 },    // Egg
      { id: 4610, timeSec: 30 },   // Baking Chocolate
      { id: 5376, timeSec: 63 },   // Chocolate Sprinkles Block
    ],
    spices: { sugar: 2 },
    perfectBonusItemId: 5414,      // Gingerbread Man at >= 95% quality
  },
  {
    resultId: 6316,
    name: "Deep-Fried Tropical Ice Cream",
    durationSec: 83,
    ingredients: [
      { id: 4764, timeSec: 0 },    // Pineapple Slice
      { id: 4984, timeSec: 43 },   // Orange Juice
      { id: 868, timeSec: 50 },    // Milk
      { id: 196, timeSec: 63 },    // Blueberry
      { id: 6314, timeSec: 82 },   // Crushed Ice
    ],
    spices: { sugar: 2 },
  },
  {
    resultId: 7056,
    name: "Coconut Tart",
    durationSec: 100,
    ingredients: [
      { id: 4562, timeSec: 0 },    // Flour
      { id: 3472, timeSec: 0 },    // Rice
      { id: 7054, timeSec: 27 },   // Coconut Milk
      { id: 4610, timeSec: 50 },   // Baking Chocolate
      { id: 4766, timeSec: 90 },   // Cherry
    ],
    spices: {},
  },
  {
    resultId: 10270,
    name: "Sweet Potato Tots",
    durationSec: 66.3,
    ingredients: [
      { id: 4562, timeSec: 0 },    // Flour
      { id: 4602, timeSec: 0 },    // Onion
      { id: 874, timeSec: 6.3 },   // Egg
      { id: 10272, timeSec: 6.3 }, // Sweet Potato Mash
      { id: 4586, timeSec: 16.3 }, // Bacon
    ],
    spices: { salt: 1, pepper: 2 },
  },
  {
    resultId: 6046,
    name: "Magnifico Carne Guacamole",
    durationSec: 66,
    ingredients: [
      { id: 4580, timeSec: 0 },    // Ground Beef
      { id: 4586, timeSec: 16 },   // Bacon
      { id: 962, timeSec: 36 },    // Tomato
      { id: 4674, timeSec: 53 },   // Chips And Guacamole
      { id: 4666, timeSec: 65 },   // Lemon
    ],
    spices: { salt: 1, pepper: 1 },
    qualityVariants: [
      { minQuality: 96, itemId: 6050 }, // Magnifico Carne Guacamole - Perfecto
      { minQuality: 85, itemId: 6048 }, // Magnifico Carne Guacamole - Sabroso
      { minQuality: 50, itemId: 6046 }, // Magnifico Carne Guacamole - Bueno
    ],
  },
  {
    resultId: 14246,
    name: "Heart Cookies",
    durationSec: 115,
    ingredients: [
      { id: 7014, timeSec: 0 },    // Cosmic 5-Spice Star
      { id: 3836, timeSec: -1, optional: true }, // Honey
      { id: 956, timeSec: 56 },    // Dough
      { id: 5376, timeSec: 98 },   // Chocolate Sprinkles Block
    ],
    spices: {},
  },
  {
    resultId: 6906,
    name: "Composer's Cookie",
    durationSec: 75,
    minChefLevel: 3,
    ingredients: [
      { id: 4562, timeSec: 0 },    // Flour
      { id: 3836, timeSec: -1, optional: true }, // Honey
      { id: 6958, timeSec: -1 },   // Beat-root Puree
      { id: 5376, timeSec: 58 },   // Chocolate Sprinkles Block
      { id: 4766, timeSec: 65 },   // Cherry
    ],
    spices: { sugar: 2 },
  },
  {
    resultId: 6908,
    name: "Glutton's Gazpacho",
    durationSec: 90,
    minChefLevel: 4,
    ingredients: [
      { id: 6990, timeSec: 0 },    // Primordial Soup
      { id: 4602, timeSec: 23 },   // Onion
      { id: 962, timeSec: 60 },    // Tomato
      { id: 4666, timeSec: 89 },   // Lemon
    ],
    spices: { pepper: 1, sugar: 1 },
  },
  {
    resultId: 6910,
    name: "Growlectables",
    durationSec: 103,
    minChefLevel: 6,
    ingredients: [
      { id: 4562, timeSec: 0 },    // Flour
      { id: 6974, timeSec: 0 },    // Caramel
      { id: 4764, timeSec: 20 },   // Pineapple Slice
      { id: 196, timeSec: 83 },    // Blueberry
      { id: 4766, timeSec: 93 },   // Cherry
    ],
    spices: { sugar: 3 },
  },
  {
    resultId: 6912,
    name: "Skill Spice",
    durationSec: 116,
    minChefLevel: 8,
    ingredients: [
      { id: 7014, timeSec: 0 },    // Cosmic 5-Spice Star
      { id: 3472, timeSec: 16 },   // Rice
      { id: 4602, timeSec: 50 },   // Onion
      { id: 868, timeSec: 83 },    // Milk
      { id: 962, timeSec: 86 },    // Tomato
    ],
    spices: { salt: 1, sugar: 1, pepper: 1 },
  },
  {
    resultId: 6914,
    name: "Gemonade",
    durationSec: 40,
    minChefLevel: 9,
    ingredients: [
      { id: 822, timeSec: 0 },     // Water Bucket
      { id: 4984, timeSec: 0 },    // Orange Juice
      { id: 4666, timeSec: 38 },   // Lemon
      { id: 7000, timeSec: 38 },   // Sprig of Mint
    ],
    spices: { sugar: 3 },
  },
];

/** Set of all valid main ingredient item IDs that can be placed into an oven. */
export const OVEN_COOKABLE_INGREDIENTS: ReadonlySet<number> = (() => {
  const ids = new Set<number>([
    962,  // Tomato (forms Salsa with Habanero Pepper 712 or Onion 4602)
    712,  // Habanero Pepper (forms Salsa with Tomato 962)
    4602, // Onion
  ]);
  for (const recipe of OVEN_RECIPES) {
    for (const ing of recipe.ingredients) {
      ids.add(ing.id);
    }
  }
  return ids;
})();
