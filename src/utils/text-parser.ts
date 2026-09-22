type Entry = [string, string[]];

export class TextParser {
  private entries: Entry[];

  constructor(raw: string = "", delimiter: string = "|") {
    this.entries = [];
    if (raw) {
      this.parse(raw, delimiter);
    }
  }

  static tokenize(raw: string, delimiter: string = "|", keepEmpty: boolean = true): string[] {
    if (!raw) return [];

    const tokens = raw.split(delimiter);

    if (keepEmpty) {
      return tokens[0] === "" ? tokens.slice(1) : tokens;
    }

    const firstEmpty = tokens[0] === "";
    return tokens.filter((token, i) => token !== "" || (i === 0 && !firstEmpty));
  }

  parse(raw: string, delimiter: string = "|"): void {
    this.entries = [];
    if (!raw) return;

    const lines = raw.split("\n");

    for (const line of lines) {
      const tokens = TextParser.tokenize(line, delimiter, true);
      if (tokens.length >= 2 && tokens[0] !== undefined) {
        this.entries.push([tokens[0], tokens.slice(1)]);
      }
    }
  }

  add(key: string | number, ...values: (string | number)[]): void {
    this.entries.push([String(key), values.map(String)]);
  }

  set(key: string | number, ...values: (string | number)[]): void {
    const target = String(key);
    const normalized = values.map(String);
    const entry = this.entries.find(([k]) => k === target);

    if (entry) {
      entry[1] = normalized;
    } else {
      this.entries.push([target, normalized]);
    }
  }

  remove(key: string | number): void {
    const target = String(key);
    this.entries = this.entries.filter(([k]) => k !== target);
  }

  get(key: string | number, index: number = 0): string {
    const target = String(key);
    const entry = this.entries.find(([k]) => k === target);
    return entry?.[1]?.[index] ?? "";
  }

  getInt(key: string | number, index: number = 0, fallback: number = 0): number {
    const value = this.get(key, index);
    if (!value) return fallback;

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  contains(key: string | number): boolean {
    const target = String(key);
    return this.entries.some(([k]) => k === target);
  }

  empty(): boolean {
    return this.entries.length === 0;
  }
  getEntries(): Entry[] {
    return this.entries.map(([key, values]) => [key, [...values]]);
  }

  toString(delimiter = "|", prependText = "") {
    return this.entries.map(([key, values]) => `${prependText}${key}${delimiter}${values.join(delimiter)}`).join("\n");
  }
}
