import { deflateSync, inflateSync } from "zlib";
import { ExtendBuffer } from "./extend-buffer";

// ProtonSDK utils related
export interface MipMap {
  width: number;
  height: number;
  bufferLength: number;
  count: number;
}

export interface RTPack {
  type: string;
  version: number;
  reserved: number;
  compressedSize: number;
  decompressedSize: number;
  compressionType: number;
  reserved2: Int8Array;
}

export interface RTTXTR {
  type: string;
  version: number;
  reserved: number;
  width: number;
  height: number;
  format: number;
  originalWidth: number;
  originalHeight: number;
  isAlpha: number;
  isCompressed: number;
  reservedFlags: number;
  mipmap: MipMap;
  reserved2: Int32Array;
}

export function getLowestPowerOf2(n: number) {
  if (n <= 1) return 1;
  return 1 << (32 - Math.clz32(n - 1));
}

export function protonSDKHash(chunk: number[]): number {
  let hash = 0x55555555;
  chunk.forEach((x) => (hash = (hash >>> 27) + (hash << 5) + x));
  return hash >>> 0;
}

/**
 * Predictor for PNG Paeth filter reconstruction.
 */
function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decodes scanlines from a truecolor RGBA PNG buffer into raw 8-bit RGBA pixel bytes.
 */
function extractRgbaFromPng(png: Buffer): { width: number; height: number; rgba: Uint8Array } {
  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];
  let pos = 8;

  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.subarray(pos + 4, pos + 8).toString("ascii");

    if (type === "IHDR") {
      width = png.readUInt32BE(pos + 8);
      height = png.readUInt32BE(pos + 12);
    } else if (type === "IDAT") {
      idatChunks.push(png.subarray(pos + 8, pos + 8 + len));
    } else if (type === "IEND") {
      break;
    }

    pos += 12 + len;
  }

  const uncompressed = inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const rowSize = 1 + width * bpp;
  const raw = new Uint8Array(width * height * bpp);
  let prevRow = new Uint8Array(width * bpp);

  for (let y = 0; y < height; y++) {
    const filter = uncompressed[y * rowSize];
    const curRow = new Uint8Array(width * bpp);
    const rowOffset = y * rowSize + 1;

    for (let x = 0; x < width * bpp; x++) {
      const val = uncompressed[rowOffset + x] ?? 0;
      const left = x >= bpp ? (curRow[x - bpp] ?? 0) : 0;
      const up = prevRow[x] ?? 0;
      const upLeft = x >= bpp ? (prevRow[x - bpp] ?? 0) : 0;

      if (filter === 0) {
        curRow[x] = val;
      } else if (filter === 1) {
        curRow[x] = (val + left) & 0xff;
      } else if (filter === 2) {
        curRow[x] = (val + up) & 0xff;
      } else if (filter === 3) {
        curRow[x] = (val + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        curRow[x] = (val + paethPredictor(left, up, upLeft)) & 0xff;
      }
    }

    raw.set(curRow, y * width * bpp);
    prevRow = curRow;
  }

  return { width, height, rgba: raw };
}

/**
 * Encodes raw RGBA pixel bytes into a valid baseline PNG buffer.
 */
function rgbaToPng(width: number, height: number, rgba: Uint8Array): Buffer {
  const bpp = 4;
  const rowSize = 1 + width * bpp;
  const raw = new Uint8Array(rowSize * height);

  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // Filter 0 (None)
    raw.set(rgba.subarray(y * width * bpp, (y + 1) * width * bpp), y * rowSize + 1);
  }

  const idat = deflateSync(raw);

  const makeChunk = (type: string, data: Uint8Array): Buffer => {
    const buf = Buffer.alloc(12 + data.length);
    buf.writeUInt32BE(data.length, 0);
    buf.write(type, 4, "ascii");
    Buffer.from(data).copy(buf, 8);
    const crc = Bun.hash.crc32(buf.subarray(4, 8 + data.length));
    buf.writeUInt32BE(crc >>> 0, 8 + data.length);
    return buf;
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per channel
  ihdr.writeUInt8(6, 9); // Color type 6 (RGBA)
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idat),
    makeChunk("IEND", new Uint8Array(0)),
  ]);
}

export class RTTEX {
  public image: Buffer;
  public type: string | undefined;

  constructor(image: Buffer) {
    if (!Buffer.isBuffer(image)) throw new Error("Please use buffer instead.");
    if (image.subarray(0, 6).toString() === "RTPACK" || image.subarray(0, 6).toString() === "RTTXTR") {
      // ignore
    } else throw new Error("File header must be a RTPACK or RTTXTR");

    this.image = image;
    this.type = image.subarray(0, 6).toString() || undefined;
  }

  private static getLowestPowerOf2(value: number): number {
    return 1 << Math.ceil(Math.log2(value));
  }

  public parseRTPACK(): RTPack {
    if (this.type !== "RTPACK") throw new TypeError("Invalid type of RTPACK");
    const data: RTPack = {
      type: this.image.subarray(0, 6).toString(),
      version: this.image.readUint8(6),
      reserved: this.image.readUint8(7),
      compressedSize: this.image.readUInt32LE(8),
      decompressedSize: this.image.readUInt32LE(12),
      compressionType: this.image.readUint8(16),
      reserved2: new Int8Array(15),
    };

    for (let i = 17; i <= 31; i++) {
      data.reserved2[i - 17] = this.image.readUint8(i);
    }

    return data;
  }

  public parseRTTXTR(): RTTXTR {
    let img = this.image;

    if (this.type === "RTPACK") {
      img = inflateSync(this.image.subarray(32));
    }

    if (img.subarray(0, 6).toString() !== "RTTXTR") throw new TypeError("Invalid type of RTTXTR");

    const data: RTTXTR = {
      type: img.subarray(0, 6).toString(),
      version: img.readUint8(6),
      reserved: img.readUint8(7),
      height: img.readInt32LE(8),
      width: img.readInt32LE(12),
      format: img.readInt32LE(16),
      originalHeight: img.readInt32LE(20),
      originalWidth: img.readInt32LE(24),
      isAlpha: img.readUint8(28),
      isCompressed: img.readUint8(29),
      reservedFlags: img.readUint16LE(30),
      mipmap: {
        height: img.readInt32LE(100),
        width: img.readInt32LE(104),
        bufferLength: img.readInt32LE(108),
        count: img.readInt32LE(32),
      },
      reserved2: new Int32Array(16),
    };

    let pos = 36;
    for (let i = 0; i < 16; i++) {
      data.reserved2[i] = img.readInt32LE(pos);
      pos += 4;
    }

    return data;
  }

  public static hash(buf: Buffer): number {
    let hash = 0x55555555;
    buf.forEach((x) => (hash = (hash >>> 27) + (hash << 5) + x));
    return hash >>> 0;
  }

  public static async decode(rttexImg: Buffer): Promise<Buffer> {
    let data = rttexImg;

    if (!Buffer.isBuffer(data)) throw new Error("Please use buffer instead.");

    if (data.subarray(0, 6).toString() === "RTPACK") {
      data = inflateSync(rttexImg.subarray(32));
    }

    if (data.subarray(0, 6).toString() === "RTTXTR") {
      const height = data.readInt32LE(20);
      const width = data.readInt32LE(24);
      const rgba = data.subarray(124);

      const rawPng = rgbaToPng(width, height, rgba);
      const flipped = await new Bun.Image(rawPng).flip().png().bytes();
      return Buffer.from(flipped);
    } else {
      throw new Error("Invalid format type.");
    }
  }

  public static async encode(img: Buffer): Promise<Buffer> {
    if (!Buffer.isBuffer(img)) throw new Error("Please use buffer instead.");

    if (img.subarray(0, 6).toString() === "RTPACK" || img.subarray(0, 6).toString() === "RTTXTR") {
      throw new TypeError("Invalid format, must be an image");
    }

    // 1. Flip vertically and normalize to PNG buffer via Bun.Image
    const flippedImg = new Bun.Image(img).flip();
    const pngBuffer = await flippedImg.png().buffer();

    // 2. Extract raw RGBA pixels from flipped PNG
    const { width, height, rgba } = extractRgbaFromPng(pngBuffer);

    // 3. Assemble RTTXTR binary header (124 bytes)
    const rttex = new ExtendBuffer(124);

    rttex.writeString("RTTXTR", 0);

    rttex.writeU8(0); // version
    rttex.writeU8(0); // reserved

    rttex.writeI32(RTTEX.getLowestPowerOf2(height)); // height
    rttex.writeI32(RTTEX.getLowestPowerOf2(width)); // width
    rttex.writeI32(5121); // format
    rttex.writeI32(height); // originalHeight
    rttex.writeI32(width); // originalWidth
    rttex.writeU8(1); // isAlpha
    rttex.writeU8(0); // isCompressed
    rttex.writeU16(1); // reservedFlags
    rttex.writeI32(1); // mipmapCount

    // reserved (16 * 4 = 64 bytes)
    for (let i = 0; i < 16; i++) {
      rttex.writeI32(0);
    }

    rttex.writeI32(height); // mipmapHeight
    rttex.writeI32(width); // mipmapWidth
    rttex.writeI32(rgba.length); // bufferLength

    const compressed = deflateSync(Buffer.concat([Buffer.from(rttex.data), rgba]));

    // 4. Assemble RTPACK outer header (32 bytes)
    const rtpack = new ExtendBuffer(32);

    rtpack.writeString("RTPACK", 0);

    rtpack.writeU8(1); // version
    rtpack.writeU8(1); // reserved

    rtpack.writeU32(compressed.length); // compressedSize
    rtpack.writeU32(124 + rgba.length); // decompressedSize

    rtpack.writeU8(1); // compressionType

    // reserved (15 bytes)
    for (let i = 0; i < 15; i++) {
      rtpack.writeU8(0);
    }

    return Buffer.concat([Buffer.from(rtpack.data), compressed]);
  }
}

