/**
 * Maximum / perfect base weights (in pounds, lb) for each catchable fish and crab
 * in Growtopia per the official Growtopia Wiki.
 *
 * Catching or possessing a fish at or above this weight marks it as "Perfect"
 * (which emits a glowing aura inside Fish Tanks and qualifies for the Training Port).
 */
export const FISH_MAX_WEIGHT: Readonly<Record<number, number>> = {
  3000: 15,   // Goldfish
  3026: 30,   // Catfish
  3030: 50,   // Dogfish
  5450: 50,   // Glass Piglet Squid
  3038: 70,   // Bass
  3032: 90,   // Gar
  3034: 120,  // Mahi Mahi
  3224: 150,  // Gingerbread Fish
  3434: 150,  // Rainbowfish
  3436: 150,  // Totally Legit Bunnyfish
  3438: 150,  // Seahorse
  3440: 150,  // Mutant Fish
  3544: 150,  // Picasso Triggerfish
  3550: 150,  // Axolotl
  3620: 150,  // Pineapple Fish
  3746: 150,  // Firefin
  5100: 150,  // Koi Fish
  3036: 160,  // Sunfish
  3814: 160,  // Stonefish
  5538: 160,  // Maidmare Fish
  3226: 180,  // Swedish Fish
  3024: 200,  // Whale
  3092: 200,  // Skeletal Shark
  3094: 200,  // Ghost Fish
  3096: 200,  // Demon Angler
  3220: 200,  // Neon Squid
  3222: 200,  // Antarctic Icefish
  3450: 200,  // Lobster
  3452: 200,  // Purple Shore Crab
  3454: 200,  // Alaskan King Crab
  3456: 200,  // Dungeonist Crab
  3458: 200,  // Crawdad
  3460: 200,  // Hermit Crab
  3820: 200,  // Orca
  4958: 200,  // Sand Shark
  5448: 200,  // Mr. Narwhal
  5542: 200,  // Double-Headed Angel-Devil Fish
  5548: 200,  // Absolutely Real Elephant Fish
  5552: 200,  // Cuttlefish
  5574: 200,  // Alpha Great White Shark
  5580: 200,  // Weird Manta Ray
  7744: 200,  // Dragon Turtle
  8460: 200,  // Clockwork Fish
  10264: 200, // Turkey Fish
};

/**
 * Returns the maximum/perfect weight threshold for a given fish item ID.
 * Defaults to 200 lb for unlisted or apex fish.
 */
export function getFishMaxWeight(itemId: number): number {
  return FISH_MAX_WEIGHT[itemId] ?? 200;
}

/**
 * Checks whether a given fish weight meets or exceeds the species' perfect threshold.
 */
export function isFishPerfect(itemId: number, weight: number): boolean {
  return weight >= getFishMaxWeight(itemId);
}
