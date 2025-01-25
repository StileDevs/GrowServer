import { StringOptions } from "growtopia.js";
import { STRING_CIPHER_KEY } from "../Constants";

export class ExtendBuffer {
  public data: Buffer;
  public mempos: number;

  constructor(alloc: number) {
    this.data = Buffer.alloc(alloc);
    this.mempos = 0;
  }

  public readU8() {
    const val = this.data.readUInt8(this.mempos);
    this.mempos += 1;
    return val;
  }
  public readU16() {
    const val = this.data.readUInt16LE(this.mempos);
    this.mempos += 2;
    return val;
  }
  public readU32() {
    const val = this.data.readUInt32LE(this.mempos);
    this.mempos += 4;
    return val;
  }
  public writeU8(value: number) {
    const val = this.data.writeUInt8(value, this.mempos);
    this.mempos += 1;
    return val;
  }
  public writeU16(value: number) {
    const val = this.data.writeUInt16LE(value, this.mempos);
    this.mempos += 2;
    return val;
  }
  public writeU32(value: number) {
    const val = this.data.writeUInt32LE(value, this.mempos);
    this.mempos += 4;
    return val;
  }

  public readI8() {
    const val = this.data.readInt8(this.mempos);
    this.mempos += 1;
    return val;
  }
  public readI16() {
    const val = this.data.readInt16LE(this.mempos);
    this.mempos += 2;
    return val;
  }
  public readI32() {
    const val = this.data.readInt32LE(this.mempos);
    this.mempos += 4;
    return val;
  }
  public writeI8(value: number) {
    const val = this.data.writeInt8(value, this.mempos);
    this.mempos += 1;
    return val;
  }
  public writeI16(value: number) {
    const val = this.data.writeInt16LE(value, this.mempos);
    this.mempos += 2;
    return val;
  }
  public writeI32(value: number) {
    const val = this.data.writeInt32LE(value, this.mempos);
    this.mempos += 4;
    return val;
  }

  public async readString(
    opts: StringOptions = {
      encoded: false
    }
  ): Promise<string> {
    const len = this.data.readInt16LE(this.mempos);
    this.mempos += 2;

    if (!opts.encoded)
      return this.data.toString("utf-8", this.mempos, (this.mempos += len));
    else {
      const chars = [];
      for (let i = 0; i < len; i++) {
        chars.push(
          String.fromCharCode(
            this.data[this.mempos] ^
              STRING_CIPHER_KEY.charCodeAt(
                (opts.id! + i) % STRING_CIPHER_KEY.length
              )
          )
        );
        this.mempos++;
      }

      const str = chars.join("");
      return str;
    }
  }

  public writeString(
    str: string,
    id?: number,
    encoded: boolean = false
  ): Promise<undefined> {
    return new Promise((resolve) => {
      // write the str length first

      this.data.writeUInt16LE(str.length, this.mempos);
      this.mempos += 2;

      if (!encoded) {
        if (str.length) this.data.fill(str, this.mempos);

        this.mempos += str.length;
      } else {
        const chars = [];

        if (!id) return;
        for (let i = 0; i < str.length; i++)
          chars.push(
            str.charCodeAt(i) ^
              STRING_CIPHER_KEY.charCodeAt((i + id) % STRING_CIPHER_KEY.length)
          );

        for (const char of chars) this.data[this.mempos++] = char;
      }

      return resolve(undefined);
    });
  }
}
