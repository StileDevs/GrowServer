// Credits https://github.com/OceanicJS/Oceanic/blob/dev/lib/util/Collection.ts

/** A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map | Map} with some Array-like additions. */
export interface Collection<K, V> extends Map<K, V> {
  /** If this collection is empty. */
  readonly empty: boolean;

  /** See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every | Array#every } */
  every<T extends V, ThisArg = Collection<K, V>>(
    predicate: (value: V, index: number, array: Array<V>) => value is T,
    thisArg?: ThisArg,
  ): this is Array<T>;
  every<ThisArg = Collection<K, V>>(
    predicate: (value: V, index: number, array: Array<V>) => unknown,
    thisArg?: ThisArg,
  ): boolean;

  /** See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter | Array#filter } */
  filter<S extends V, ThisArg = Collection<K, V>>(
    predicate: (
      this: ThisArg,
      value: V,
      index: number,
      array: Array<V>,
    ) => value is S,
    thisArg?: ThisArg,
  ): Array<S>;
  filter<ThisArg = Collection<K, V>>(
    predicate: (
      this: ThisArg,
      value: V,
      index: number,
      array: Array<V>,
    ) => unknown,
    thisArg?: ThisArg,
  ): Array<V>;

  /** See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find | Array#find } */
  find<S extends V, ThisArg = Collection<K, V>>(
    predicate: (
      this: ThisArg,
      value: V,
      index: number,
      obj: Array<V>,
    ) => value is S,
    thisArg?: ThisArg,
  ): S | undefined;
  find<ThisArg = Collection<K, V>>(
    predicate: (
      this: ThisArg,
      value: V,
      index: number,
      obj: Array<V>,
    ) => unknown,
    thisArg?: ThisArg,
  ): V | undefined;

  /** See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex | Array#findIndex } */
  findIndex(
    predicate: (value: V, index: number, obj: Array<V>) => unknown,
    thisArg?: unknown,
  ): number;

  /**
   * Get the first element, or first X elements if a number is provided.
   * @param amount The amount of elements to get.
   */
  first(): V | undefined;
  first(amount: number): Array<V>;

  /**
   * Get the last element, or last X elements if a number is provided.
   * @param amount The amount of elements to get.
   */
  last(): V | undefined;
  last(amount: number): Array<V>;

  /** See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map | Array#map } */
  map<T>(
    predicate: (value: V, index: number, obj: Array<V>) => T,
    thisArg?: unknown,
  ): Array<T>;

  /**
   * Pick a random element from the collection, or undefined if the collection is empty.
   */
  random(): V | undefined;

  /** See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce | Array#reduce } */
  reduce(
    predicate: (
      previousValue: V,
      currentValue: V,
      currentIndex: number,
      array: Array<V>,
    ) => V,
  ): V;
  reduce(
    predicate: (
      previousValue: V,
      currentValue: V,
      currentIndex: number,
      array: Array<V>,
    ) => V,
    initialValue: V,
  ): V;
  reduce<T>(
    predicate: (
      previousValue: T,
      currentValue: V,
      currentIndex: number,
      array: Array<V>,
    ) => T,
    initialValue: T,
  ): T;

  /** See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight | Array#reduceRight } */
  reduceRight(
    predicate: (
      previousValue: V,
      currentValue: V,
      currentIndex: number,
      array: Array<V>,
    ) => V,
  ): V;
  reduceRight(
    predicate: (
      previousValue: V,
      currentValue: V,
      currentIndex: number,
      array: Array<V>,
    ) => V,
    initialValue: V,
  ): V;
  reduceRight<T>(
    predicate: (
      previousValue: T,
      currentValue: V,
      currentIndex: number,
      array: Array<V>,
    ) => T,
    initialValue: T,
  ): T;

  /** See: {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some | Array#some } */
  some<ThisArg = Collection<K, V>>(
    predicate: (value: V, index: number, array: Array<V>) => unknown,
    thisArg?: ThisArg,
  ): boolean;

  /** Get the values of this collection as an array. */
  toArray(): Array<V>;
}
