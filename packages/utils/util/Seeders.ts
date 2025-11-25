const HASH_CONSTANTS = {
  FNV_OFFSET_BASIS: 2166136261,
  FNV_PRIME:        16777619,
  XOSHIRO_A:        0x9e3779b9,
  XOSHIRO_B:        0x5bd1e995,
  XOSHIRO_C:        0x45d9f3b,
};

function fnv1aHash(str: string): number {
  let hash = HASH_CONSTANTS.FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, HASH_CONSTANTS.FNV_PRIME);
  }
  return hash >>> 0;
}

function mixHash(hash: number): number {
  hash = Math.imul(hash ^ (hash >>> 16), HASH_CONSTANTS.XOSHIRO_C);
  hash = Math.imul(hash ^ (hash >>> 13), HASH_CONSTANTS.XOSHIRO_C);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function validateRange(min: number, max: number, paramName = 'range'): void {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error(`${paramName}: min and max must be finite numbers`);
  }
  if (min >= max) {
    throw new Error(`${paramName}: min (${min}) must be less than max (${max})`);
  }
}

function validateSafeInteger(value: number, paramName: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${paramName} must be a safe integer, got: ${value}`);
  }
}

/**
 * Unified seeded random number generator providing deterministic pseudo-random values
 * 
 * This class creates a deterministic random number generator based on a seed string or number.
 * All methods will produce the same sequence of values when given the same seed, making it
 * perfect for procedural generation, testing, and reproducible randomness.
 * 
 * @example Basic Usage
 * ```typescript
 * const rng = new Seeders("world123");
 * console.log(rng.hash());           // Always: 3847291023
 * console.log(rng.int(10));          // Random int 0-9: 4
 * console.log(rng.float(1.0));       // Random float 0-1: 0.7834
 * console.log(rng.alphanumeric(8));  // Random string: "aB3cD1eF"
 * ```
 * 
 * @example With Salt for Different Sequences
 * ```typescript
 * const levelGen = new Seeders("world123", "level1");
 * const itemGen = new Seeders("world123", "items");
 * // Same base seed, different sequences due to salt
 * ```
 * 
 * @example Procedural Generation
 * ```typescript
 * const rng = new Seeders("dungeon_42");
 * const roomCount = rng.int(15, 5);           // 5-14 rooms
 * const treasureChance = rng.float(1.0);      // 0.0-1.0 probability
 * const monsterType = rng.choice(['goblin', 'orc', 'skeleton']);
 * ```
 */
export class Seeders {
  private seed: number;
  private state: number;
  private originalSeed: string | number;
  private originalSalt: string | number;
  private randoms: Record<string, () => number> = {};

  /**
   * Creates a new seeded random number generator
   * 
   * @param seed - Base seed value (string or number) that determines the random sequence
   * @param salt - Optional salt to create different sequences from same base seed
   * 
   * @example
   * ```typescript
   * const rng1 = new Seeders("myGame");
   * const rng2 = new Seeders("myGame", "level2"); // Different sequence
   * const rng3 = new Seeders(12345);             // Number seed
   * ```
   */
  constructor(seed: string | number, salt: string | number = '') {
    if (typeof seed !== 'string' && typeof seed !== 'number') {
      throw new Error('Seed must be a string or number');
    }

    this.originalSeed = seed;
    this.originalSalt = salt;
    this.seed = this.stringToSeed(seed.toString() + salt.toString());
    this.state = mixHash(fnv1aHash(seed.toString() + salt.toString()));
    this.randoms = this.createRandomGenerators();
  }

  /**
   * Create individual seeded random number generators for different purposes
   * Ensures each method has its own deterministic sequence
   */
  private createRandomGenerators(): Record<string, () => number> {
    const offsets = {
      "hash":         0,
      "next":         1,
      "int":          2,
      "float":        3,
      "alphanumeric": 4,
      "noise":        5,
      "shuffle":      6,
      "choice":       7
    };

    return Object.fromEntries(
      Object.entries(offsets).map(([key, offset]) => [
        key,
        this.seededRandom((this.seed + offset) % 499 + 1)
      ])
    );
  }

  /**
   * Converts string to numeric seed with good distribution
   */
  private stringToSeed(str: string): number {
    if (!str.length) return 3000;

    let hash = str.split('').reduce((acc, char) =>
      ((acc << 5) - acc) + char.charCodeAt(0) | 0, 0
    );

    hash = Math.abs(hash) || 3000;
    return ((hash & 0x1FFF) % 10000) + 1;
  }

  /**
   * Creates a seeded random generator using Xorshift algorithm
   */
  private seededRandom(seed: number): () => number {
    let state = seed % 2147483647 || 2147483646;
    return () => {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
  }

  /**
   * Generates a deterministic hash value from the seed, optionally bounded
   * 
   * This method always returns the same value for the same seed, making it perfect
   * for generating consistent IDs, colors, or other properties based on a seed.
   * 
   * @param max - Maximum value (exclusive). If provided alone, range is 0 to max
   * @param min - Minimum value (inclusive). Defaults to 0 if max is provided
   * @returns Deterministic hash value derived from seed
   * 
   * @example
   * ```typescript
   * const rng = new Seeders("player123");
   * 
   * // Raw hash value
   * console.log(rng.hash());        // 3847291023
   * 
   * // Bounded hash (0-99)
   * console.log(rng.hash(100));     // 23
   * 
   * // Custom range (10-50)
   * console.log(rng.hash(50, 10));  // 34
   * 
   * // Color generation
   * const red = rng.hash(256);
   * const green = rng.hash(256);
   * const blue = rng.hash(256);
   * ```
   */
  hash(max?: number, min: number = 0): number {
    let hash = fnv1aHash(this.originalSeed.toString() + this.originalSalt.toString());

    if (max !== undefined) {
      validateRange(min, max, 'hash bounds');
      const range = max - min;
      hash = min + (hash % range);
    }

    return hash;
  }

  /**
   * Generates next pseudo-random number in the sequence (0 to 1)
   * 
   * This advances the internal state and returns the next value in the sequence.
   * Each call produces a different value, but the sequence is deterministic.
   * 
   * @returns Number between 0 (inclusive) and 1 (exclusive)
   * 
   * @example
   * ```typescript
   * const rng = new Seeders("test");
   * console.log(rng.next()); // 0.2341
   * console.log(rng.next()); // 0.8923
   * console.log(rng.next()); // 0.4567
   * ```
   */
  next(): number {
    this.state = mixHash(this.state);
    return this.state / 0x100000000;
  }

  /**
   * Generates random integer in specified range
   * 
   * @param max - Maximum value (exclusive). If only max is provided, range is 0 to max
   * @param min - Minimum value (inclusive). Defaults to 0
   * @returns Random integer between min (inclusive) and max (exclusive)
   * 
   * @example
   * ```typescript
   * const rng = new Seeders("dice");
   * 
   * // Dice roll (1-6)
   * console.log(rng.int(7, 1));     // 4
   * 
   * // Array index (0-9)
   * console.log(rng.int(10));       // 7
   * 
   * // Damage range (50-100)
   * console.log(rng.int(101, 50));  // 73
   * ```
   */
  int(max: number, min: number = 0): number {
    validateSafeInteger(min, 'min');
    validateSafeInteger(max, 'max');
    validateRange(min, max, 'int range');

    const range = max - min;
    return min + Math.floor(this.next() * range);
  }

  /**
   * Generates random floating-point number in specified range
   * 
   * @param max - Maximum value (exclusive). If only max is provided, range is 0 to max
   * @param min - Minimum value (inclusive). Defaults to 0
   * @param dont_random - If true, always returns constant value
   * @returns Random float between min (inclusive) and max (exclusive)
   * 
   * @example
   * ```typescript
   * const rng = new Seeders("physics");
   * 
   * // Probability (0-1)
   * console.log(rng.float(1.0));        // 0.7834
   * 
   * // Temperature (-10 to 40)
   * console.log(rng.float(40, -10));    // 23.4
   * 
   * // Speed multiplier
   * console.log(rng.float(2.0, 0.5));   // 1.23
   * ```
   */
  float(max: number, min: number = 0, dont_random?: boolean): number {
    validateRange(min, max, 'float range');
    return min + (dont_random ? 0 : this.next()) * (max - min);
  }

  /**
   * Generates deterministic alphanumeric string
   * 
   * Perfect for generating consistent IDs, passwords, or random strings that need
   * to be the same across multiple runs with the same seed.
   * 
   * @param length - Desired string length
   * @param charset - Custom character set (defaults to alphanumeric)
   * @returns Deterministic string of specified length
   * 
   * @example
   * ```typescript
   * const rng = new Seeders("user123");
   * 
   * // Session ID
   * console.log(rng.alphanumeric(16));              // "aB3cD1eFgH2iJ4kL"
   * 
   * // Numeric code
   * console.log(rng.alphanumeric(6, "0123456789")); // "384729"
   * 
   * // Hex color
   * console.log(rng.alphanumeric(6, "0123456789ABCDEF")); // "3A4F2C"
   * 
   * // Password
   * console.log(rng.alphanumeric(12, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"));
   * ```
   */
  alphanumeric(
    length: number,
    charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  ): string {
    if (!Number.isSafeInteger(length) || length <= 0) {
      throw new Error('Length must be a positive safe integer');
    }

    if (charset.length === 0) {
      throw new Error('Charset cannot be empty');
    }

    let result = '';

    for (let i = 0; i < length; i++) {
      const index = this.randoms.alphanumeric() * charset.length;
      result += charset.charAt(Math.floor(index));
    }

    return result;
  }

  /**
   * Generates deterministic 1D Perlin-like noise
   * 
   * Creates smooth, natural-looking random values perfect for procedural generation
   * of terrain, textures, or any data that needs organic randomness.
   * 
   * @param x - Input coordinate (position along the noise function)
   * @param amplitude - Amplitude multiplier (default: 1)
   * @param max - Maximum output value (default: 1)
   * @param min - Minimum output value (default: -1)
   * @param frequency - Noise frequency - higher = more detailed (default: 0.01)
   * @param octaves - Number of noise layers for detail (default: 1)
   * @returns Deterministic noise value within specified range
   * 
   * @example
   * ```typescript
   * const rng = new Seeders("terrain");
   * 
   * // Simple height map (0-255)
   * for (let x = 0; x < 100; x++) {
   *   const height = rng.noise(x, 1, 255, 0, 0.05);
   *   console.log(`Height at ${x}: ${height}`);
   * }
   * 
   * // Animated value over time
   * const time = Date.now() * 0.001;
   * const wobble = rng.noise(time, 1, 1, -1, 0.5); // -1 to 1
   * 
   * // Multi-octave terrain
   * const detailedHeight = rng.noise(x, 1, 100, 0, 0.01, 4);
   * ```
   */
  noise(
    x: number,
    amplitude: number = 1,
    max: number = 1,
    min: number = -1,
    frequency: number = 0.01,
    octaves: number = 1
  ): number {
    validateRange(min, max, 'noise range');

    if (frequency <= 0) {
      throw new Error('Frequency must be positive');
    }

    if (!Number.isSafeInteger(octaves) || octaves < 1) {
      throw new Error('Octaves must be a positive integer');
    }

    const gradients: number[] = [];
    for (let i = 0; i < 256; i++) {
      gradients[i] = (this.randoms.noise() - 0.5) * 2;
    }

    function noise1D(x: number): number {
      const i = Math.floor(x) & 255;
      const f = x - Math.floor(x);
      const u = f * f * (3 - 2 * f);
      return gradients[i] * (1 - u) + gradients[(i + 1) & 255] * u;
    }

    let result = 0;
    let maxValue = 0;
    let currentAmplitude = amplitude;
    let currentFrequency = frequency;

    for (let i = 0; i < octaves; i++) {
      result += noise1D(x * currentFrequency) * currentAmplitude;
      maxValue += currentAmplitude;
      currentAmplitude *= 0.5;
      currentFrequency *= 2;
    }

    result /= maxValue;
    return min + (result + 1) * 0.5 * (max - min);
  }

  /**
   * Shuffles array deterministically using Fisher-Yates algorithm
   * 
   * Modifies the original array in place and returns it. The shuffle will always
   * be the same for the same seed, making it perfect for consistent randomization.
   * 
   * @param array - Array to shuffle (modified in place)
   * @returns Shuffled array (same reference as input)
   * 
   * @example
   * ```typescript
   * const rng = new Seeders("deck");
   * 
   * // Shuffle playing cards
   * const cards = ['A', 'K', 'Q', 'J', '10', '9'];
   * rng.shuffle(cards);
   * console.log(cards); // ['Q', 'A', 'J', '10', 'K', '9']
   * 
   * // Shuffle quest rewards
   * const rewards = ['sword', 'shield', 'potion', 'gold'];
   * rng.shuffle(rewards);
   * 
   * // Create shuffled copy (don't modify original)
   * const originalOrder = ['a', 'b', 'c', 'd'];
   * const shuffled = rng.shuffle([...originalOrder]);
   * ```
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.randoms.shuffle() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  /**
   * Picks random element from array deterministically
   * 
   * @param array - Array to pick from (must not be empty)
   * @returns Random element from array
   * 
   * @example
   * ```typescript
   * const rng = new Seeders("loot");
   * 
   * // Random loot drop
   * const loot = ['sword', 'shield', 'potion', 'gold'];
   * console.log(rng.choice(loot)); // 'shield'
   * 
   * // Random enemy type
   * const enemies = ['goblin', 'orc', 'skeleton'];
   * const enemy = rng.choice(enemies);
   * 
   * // Random weather
   * const weather = ['sunny', 'cloudy', 'rainy', 'stormy'];
   * const today = rng.choice(weather);
   * 
   * // Weighted choice (manual)
   * const weightedItems = ['common', 'common', 'common', 'rare', 'epic'];
   * const item = rng.choice(weightedItems);
   * ```
   */
  choice<T>(array: T[]): T {

    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }

    const index = Math.floor(this.randoms.choice() * array.length);
    return array[index];
  }

  /**
   * Resets generator to initial state with new seed
   * 
   * @param seed - New seed value
   * @param salt - Optional salt for different sequences
   * 
   * @example
   * ```typescript
   * const rng = new Seeders("level1");
   * console.log(rng.int(10)); // 4
   * 
   * // Reset with new seed
   * rng.reset("level2");
   * console.log(rng.int(10)); // 7 (different sequence)
   * 
   * // Reset to same seed
   * rng.reset("level1");
   * console.log(rng.int(10)); // 4 (back to original)
   * ```
   */
  reset(seed: string | number, salt: string | number = ''): void {
    this.originalSeed = seed;
    this.originalSalt = salt;
    this.seed = this.stringToSeed(seed.toString() + salt.toString());
    this.state = mixHash(fnv1aHash(seed.toString() + salt.toString()));
    this.randoms = this.createRandomGenerators();
  }
}

/**
 * Convenience function for quick seeded random generator creation
 * 
 * @param seed - Seed value (string or number)
 * @param salt - Optional salt for different sequences
 * @returns New Seeders instance
 * 
 * @example
 * ```typescript
 * // Quick creation
 * const rng = createSeeders("myGame", "level3");
 * 
 * // Equivalent to:
 * const rng2 = new Seeders("myGame", "level3");
 * ```
 */
export function createSeeders(seed: string | number, salt: string | number = ''): Seeders {
  return new Seeders(seed, salt);
}