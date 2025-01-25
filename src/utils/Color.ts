export class Color {
  private colors: Uint8Array = new Uint8Array(4);

  constructor(r: number, g: number, b: number, a: number = 255) {
    if (
      r < 0 ||
      r > 255 ||
      g < 0 ||
      g > 255 ||
      b < 0 ||
      b > 255 ||
      a < 0 ||
      a > 255
    ) {
      throw new Error(
        "Invalid color values. Each value must be between 0 and 255."
      );
    }

    this.colors[0] = b;
    this.colors[1] = g;
    this.colors[2] = r;
    this.colors[3] = a;
  }

  public toDecimal(): number {
    let result = 0;
    for (let index = 0; index < this.colors.length; index++) {
      result = (result << 8) + this.colors[index];
    }
    return result >>> 0;
  }

  public setRed(col: number): void {
    this.colors[2] = col;
  }

  public red(): number {
    return this.colors[2];
  }

  public setGreen(col: number): void {
    this.colors[1] = col;
  }

  public green(): number {
    return this.colors[1];
  }

  public setBlue(col: number): void {
    this.colors[0] = col;
  }

  public blue(): number {
    return this.colors[0];
  }

  public setAlpha(col: number): void {
    this.colors[3] = col;
  }

  public alpha(): number {
    return this.colors[3];
  }

  public static fromHex(hex: string): Color {
    if (!/^#?[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hex)) {
      throw new Error("Invalid hex color string.");
    }

    hex = hex.replace(/^#/, "");

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) : 255;

    return new Color(r, g, b, a);
  }

  public static fromDecimal(decimal: number): Color {
    if (decimal < 0 || decimal > 0xffffffff) {
      throw new Error(
        "Invalid decimal color value. It must be between 0 and 4294967295."
      );
    }

    const a = (decimal >> 24) & 0xff;
    const r = (decimal >> 16) & 0xff;
    const g = (decimal >> 8) & 0xff;
    const b = decimal & 0xff;

    return new Color(r, g, b, a);
  }
}
