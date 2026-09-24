export type ImageFit = "fill" | "inside";

export type ImageFilter =
  | "lanczos3"
  | "lanczos2"
  | "mitchell"
  | "cubic"
  | "mks2013"
  | "mks2021"
  | "bilinear"
  | "linear"
  | "box"
  | "nearest";

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  fit?: ImageFit;
  filter?: ImageFilter;
  withoutEnlargement?: boolean;
  without_enlargement?: boolean;
}

export interface ImageModulateOptions {
  brightness?: number;
  saturation?: number;
}

export interface ImagePngOptions {
  compressionLevel?: number;
  compression_level?: number;
  palette?: boolean;
  colors?: number;
  dither?: boolean;
}

export interface ImageTransformConf {
  resize?: string | number | ImageResizeOptions;
  fit?: ImageFit;
  filter?: ImageFilter;
  withoutEnlargement?: boolean;
  without_enlargement?: boolean;
  rotate?: number;
  flip?: boolean;
  flop?: boolean;
  modulate?: ImageModulateOptions;
  png?: ImagePngOptions;
}

export interface ParsedResizeResult {
  width: number;
  height?: number | undefined;
  options: {
    fit?: ImageFit | undefined;
    filter?: ImageFilter | undefined;
    withoutEnlargement?: boolean | undefined;
  };
}

/**
 * Checks whether any image transformation options are defined in the given configuration.
 *
 * @param conf - Image transformation configuration to inspect
 * @returns True if at least one transform operation is configured
 */
export function hasImageTransforms(conf: ImageTransformConf | undefined): boolean {
  if (!conf) return false;
  return (
    conf.resize !== undefined ||
    conf.rotate !== undefined ||
    conf.flip !== undefined ||
    conf.flop !== undefined ||
    conf.modulate !== undefined ||
    conf.png !== undefined
  );
}

/**
 * Resolves and normalizes image transformation configuration from raw custom item utils.
 * Extracts image transformation configuration exclusively from `[utils.func.image]`.
 *
 * @param rawUtils - Raw utils object parsed from conf.toml
 * @returns Normalized ImageTransformConf or undefined if no transforms are specified
 */
export function resolveImageTransformConf(rawUtils: any): ImageTransformConf | undefined {
  if (!rawUtils || typeof rawUtils !== "object") return undefined;

  const imageConf =
    rawUtils.func && typeof rawUtils.func.image === "object" && rawUtils.func.image !== null
      ? rawUtils.func.image
      : undefined;

  if (!imageConf) return undefined;

  const resolved: ImageTransformConf = { ...imageConf };
  return hasImageTransforms(resolved) ? resolved : undefined;
}

/**
 * Parses raw resize options (string "1024x256", number, or object) into structured dimensions and options.
 *
 * @param raw - Raw resize value from configuration
 * @param fallbackFit - Fallback fit mode if not specified in resize value
 * @param fallbackFilter - Fallback resampling filter if not specified in resize value
 * @param fallbackWithoutEnlargement - Fallback enlargement prevention setting
 * @returns Structured resize parameters or undefined if invalid
 */
export function parseResizeOption(
  raw: string | number | ImageResizeOptions | undefined,
  fallbackFit?: ImageFit,
  fallbackFilter?: ImageFilter,
  fallbackWithoutEnlargement?: boolean
): ParsedResizeResult | undefined {
  if (raw === undefined || raw === null) return undefined;

  let width: number | undefined;
  let height: number | undefined;
  let fit: ImageFit | undefined = fallbackFit;
  let filter: ImageFilter | undefined = fallbackFilter;
  let withoutEnlargement: boolean | undefined = fallbackWithoutEnlargement;

  if (typeof raw === "number") {
    width = raw;
  } else if (typeof raw === "string") {
    const match = raw.trim().match(/^(\d+)(?:x(\d+))?$/i);
    if (match && match[1]) {
      width = parseInt(match[1], 10);
      if (match[2]) {
        height = parseInt(match[2], 10);
      }
    }
  } else if (typeof raw === "object") {
    width = raw.width;
    height = raw.height;
    if (raw.fit) fit = raw.fit;
    if (raw.filter) filter = raw.filter;
    if (raw.withoutEnlargement !== undefined) withoutEnlargement = raw.withoutEnlargement;
    if (raw.without_enlargement !== undefined) withoutEnlargement = raw.without_enlargement;
  }

  if (typeof width !== "number" || isNaN(width) || width <= 0) {
    return undefined;
  }

  const options: { fit?: ImageFit; filter?: ImageFilter; withoutEnlargement?: boolean } = {};
  if (fit) options.fit = fit;
  if (filter) options.filter = filter;
  if (withoutEnlargement !== undefined) options.withoutEnlargement = withoutEnlargement;

  return { width, height, options };
}

/**
 * Transforms an image buffer using native Bun.Image pipeline operations according to configuration.
 *
 * @param input - Input image buffer (PNG, JPEG, etc.)
 * @param config - Transformation options (resize, rotate, flip, flop, modulate, png)
 * @returns Transformed PNG buffer
 */
export async function transformImage(input: Buffer | Uint8Array, config?: ImageTransformConf): Promise<Buffer> {
  if (!config || !hasImageTransforms(config)) {
    return Buffer.isBuffer(input) ? input : Buffer.from(input);
  }

  let pipeline = new Bun.Image(input as any);

  // 1. Resize
  if (config.resize !== undefined) {
    const parsedResize = parseResizeOption(
      config.resize,
      config.fit,
      config.filter,
      config.withoutEnlargement ?? config.without_enlargement
    );

    if (parsedResize) {
      if (parsedResize.height !== undefined) {
        pipeline = pipeline.resize(parsedResize.width, parsedResize.height, parsedResize.options as any);
      } else {
        pipeline = pipeline.resize(parsedResize.width, undefined, parsedResize.options as any);
      }
    }
  }

  // 2. Rotate
  if (typeof config.rotate === "number") {
    pipeline = pipeline.rotate(config.rotate);
  }

  // 3. Flip (vertical mirror)
  if (config.flip === true) {
    pipeline = pipeline.flip();
  }

  // 4. Flop (horizontal mirror)
  if (config.flop === true) {
    pipeline = pipeline.flop();
  }

  // 5. Modulate (brightness and saturation)
  if (config.modulate && typeof config.modulate === "object") {
    const modulateOptions: { brightness?: number; saturation?: number } = {};
    if (typeof config.modulate.brightness === "number") {
      modulateOptions.brightness = config.modulate.brightness;
    }
    if (typeof config.modulate.saturation === "number") {
      modulateOptions.saturation = config.modulate.saturation;
    }
    if (Object.keys(modulateOptions).length > 0) {
      pipeline = pipeline.modulate(modulateOptions);
    }
  }

  // 6. PNG output options
  const pngOptions: {
    compressionLevel?: number;
    palette?: boolean;
    colors?: number;
    dither?: boolean;
  } = {};

  if (config.png && typeof config.png === "object") {
    const compression = config.png.compressionLevel ?? config.png.compression_level;
    if (typeof compression === "number") pngOptions.compressionLevel = compression;
    if (typeof config.png.palette === "boolean") pngOptions.palette = config.png.palette;
    if (typeof config.png.colors === "number") pngOptions.colors = config.png.colors;
    if (typeof config.png.dither === "boolean") pngOptions.dither = config.png.dither;
  }

  const outBuffer = await pipeline.png(pngOptions).buffer();
  return Buffer.from(outBuffer);
}
