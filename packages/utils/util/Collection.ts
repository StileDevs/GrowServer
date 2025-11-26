import { Collection as BaseCollection } from "@growserver/types";

/** A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map | Map} with some Array-like additions. */
export class Collection<K, V>
  extends Map<K, V>
  implements BaseCollection<K, V>
{
  constructor(entries?: readonly (readonly [K, V])[] | null) {
    super(entries);
  }

  get empty(): boolean {
    return this.size === 0;
  }

  every<T extends V, ThisArg = Collection<K, V>>(
    predicate: (value: V, index: number, array: Array<V>) => value is T,
    thisArg?: ThisArg,
  ): this is Array<T>;
  every<ThisArg = Collection<K, V>>(
    predicate: (value: V, index: number, array: Array<V>) => unknown,
    thisArg?: ThisArg,
  ): boolean;
  every(
    predicate: (value: V, index: number, array: Array<V>) => unknown,
    thisArg?: unknown,
  ): boolean {
    return this.toArray().every(predicate, thisArg);
  }

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
  filter(
    predicate: (value: V, index: number, array: Array<V>) => unknown,
    thisArg?: unknown,
  ): Array<V> {
    return this.toArray().filter(predicate, thisArg);
  }

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
  find(
    predicate: (value: V, index: number, obj: Array<V>) => unknown,
    thisArg?: unknown,
  ): V | undefined {
    return this.toArray().find(predicate, thisArg);
  }

  findIndex(
    predicate: (value: V, index: number, obj: Array<V>) => unknown,
    thisArg?: unknown,
  ): number {
    return this.toArray().findIndex(predicate, thisArg);
  }

  first(): V | undefined;
  first(amount: number): Array<V>;
  first(amount?: number): V | Array<V> | undefined {
    if (amount === undefined) {
      const iterable = this.values();
      return iterable.next().value as V;
    }

    if (amount < 0) {
      return this.last(amount * -1);
    }
    amount = Math.min(amount, this.size);

    const iterable = this.values();
    return Array.from({ length: amount }, () => iterable.next().value as V);
  }

  last(): V | undefined;
  last(amount: number): Array<V>;
  last(amount?: number): V | Array<V> | undefined {
    const iterator = Array.from(this.values());
    if (amount === undefined) {
      return iterator.at(-1);
    }
    if (amount < 0) {
      return this.first(amount * -1);
    }
    if (!amount) {
      return [];
    }

    return iterator.slice(-amount);
  }

  map<T>(
    predicate: (value: V, index: number, obj: Array<V>) => T,
    thisArg?: unknown,
  ): Array<T> {
    return this.toArray().map(predicate, thisArg);
  }

  random(): V | undefined {
    if (this.empty) {
      return undefined;
    }
    const iterable = Array.from(this.values());

    return iterable[Math.floor(Math.random() * iterable.length)];
  }

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
  reduce<T>(
    predicate: (
      previousValue: T,
      currentValue: V,
      currentIndex: number,
      array: Array<V>,
    ) => T,
    initialValue?: T,
  ): T {
    return this.toArray().reduce(predicate, initialValue!);
  }

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
  reduceRight<T>(
    predicate: (
      previousValue: T,
      currentValue: V,
      currentIndex: number,
      array: Array<V>,
    ) => T,
    initialValue?: T,
  ): T {
    return this.toArray().reduceRight(predicate, initialValue!);
  }

  some<ThisArg = Collection<K, V>>(
    predicate: (value: V, index: number, array: Array<V>) => unknown,
    thisArg?: ThisArg,
  ): boolean {
    return this.toArray().some(predicate, thisArg);
  }

  /** Get the values of this collection as an array. */
  toArray(): Array<V> {
    return Array.from(this.values());
  }
}
