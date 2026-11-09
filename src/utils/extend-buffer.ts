export class ExtendBuffer {
  public data: number[];

  constructor(
    data: number[] | number,
    public mempos = 0,
  ) {
    this.data = Array.isArray(data) ? data : new Array(data).fill(0);
  }

  private read(size: number): number {
    let value = 0;
    for (let i = 0; i < size; i++) {
      // @ts-expect-error
      value |= this.data[this.mempos + i] << (i * 8);
    }
    this.mempos += size;
    return value >>> 0;
  }

  private readSigned(size: number): number {
    return this.read(size) << 0;
  }

  private write(value: number, size: number): void {
    for (let i = 0; i < size; i++) {
      this.data[this.mempos + i] = (value >> (i * 8)) & 0xff;
    }
    this.mempos += size;
  }

  public readU8 = () => this.read(1);
  public readU16 = (be = false) => (be ? this.readBE(2) : this.read(2));
  public readU32 = (be = false) => (be ? this.readBE(4) : this.read(4));

  public readI8 = () => this.readSigned(1);
  public readI16 = (be = false) => (be ? this.readSignedBE(2) : this.readSigned(2));
  public readI32 = (be = false) => (be ? this.readSignedBE(4) : this.readSigned(4));

  private readBE(size: number): number {
    let value = 0;
    for (let i = 0; i < size; i++) {
      // @ts-expect-error
      value = (value << 8) | this.data[this.mempos + i];
    }
    this.mempos += size;
    return value >>> 0;
  }

  private readSignedBE(size: number): number {
    return this.readBE(size) << 0;
  }

  public writeU8 = (value: number) => this.write(value, 1);
  public writeU16 = (value: number, be = false) => (be ? this.writeBE(value, 2) : this.write(value, 2));
  public writeU32 = (value: number, be = false) => (be ? this.writeBE(value, 4) : this.write(value, 4));

  public writeI8 = (value: number) => this.write(value, 1);
  public writeI16 = (value: number, be = false) => (be ? this.writeBE(value, 2) : this.write(value, 2));
  public writeI32 = (value: number, be = false) => (be ? this.writeBE(value, 4) : this.write(value, 4));

  private writeBE(value: number, size: number): void {
    for (let i = 0; i < size; i++) {
      this.data[this.mempos + i] = (value >> ((size - 1 - i) * 8)) & 0xff;
    }
    this.mempos += size;
  }

  public writeU = (size: number, value: number, be = false) => {
    const methods = { 1: this.writeU8, 2: this.writeU16, 4: this.writeU32 };
    methods[size as 1 | 2 | 4](value, be);
  };

  public writeI = (size: number, value: number, be = false) => {
    const methods = { 1: this.writeI8, 2: this.writeI16, 4: this.writeI32 };
    methods[size as 1 | 2 | 4](value, be);
  };

  public readFloat = (be = false) => {
    const buf = Buffer.from(this.data.slice(this.mempos, this.mempos + 4));
    this.mempos += 4;
    return be ? buf.readFloatBE(0) : buf.readFloatLE(0);
  };

  public writeFloat = (value: number, be = false) => {
    const buf = Buffer.alloc(4);
    if (be) {
      buf.writeFloatBE(value, 0);
    } else {
      buf.writeFloatLE(value, 0);
    }
    for (let i = 0; i < 4; i++) {
      // @ts-expect-error
      this.data[this.mempos + i] = buf[i];
    }
    this.mempos += 4;
  };

  public readString(lenBytes: number = 2, be = false): string {
    const len = lenBytes === 4 ? this.readU32(be) : this.readU16(be);
    const chars = this.data.slice(this.mempos, this.mempos + len);
    this.mempos += len;
    return Buffer.from(chars).toString("utf-8");
  }

  public writeString(str: string, lenBytes: number = 2, be = false): void {
    const bytes = Buffer.from(str, "utf-8");
    if (lenBytes === 4) {
      this.writeU32(bytes.length, be);
    } else if (lenBytes === 2) {
      this.writeU16(bytes.length, be);
    } else if (lenBytes === 1) {
      this.writeU8(bytes.length);
    }
    for (let i = 0; i < bytes.length; i++) {
      // @ts-expect-error
      this.data[this.mempos + i] = bytes[i];
    }
    this.mempos += bytes.length;
  }

  public readBytes(len: number): number[] {
    const bytes = this.data.slice(this.mempos, this.mempos + len);
    this.mempos += len;
    return bytes;
  }

  public writeBytes(bytes: number[] | Buffer | Uint8Array): void {
    for (let i = 0; i < bytes.length; i++) {
      this.data[this.mempos + i] = bytes[i]!;
    }
    this.mempos += bytes.length;
  }

  public toBuffer(): Buffer {
    return Buffer.from(this.data);
  }
  public toHex(separator = " "): string {
    return this.data.map((b) => b.toString(16).padStart(2, "0")).join(separator);
  }
}
