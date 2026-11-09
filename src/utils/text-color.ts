import { Collection } from "./collection";
import { Color } from "./color";

/**
 * Text color codes used in Growtopia formatting.
 */
export enum TextColorCode {
  DEFAULT = "`0",
  LIGHT_CYAN = "`1",
  GREEN = "`2",
  LIGHT_BLUE = "`3",
  CRAZY_RED = "`4",
  PINKY_PURPLE = "`5",
  BROWN = "`6",
  LIGHT_GRAY = "`7",
  CRAZY_ORANGE = "`8",
  YELLOW = "`9",
  BRIGHT_CYAN = "`!",
  BRIGHT_RED_PINK = "`@",
  BRIGHT_PURPLE = "`#",
  PALE_YELLOW = "`$",
  LIGHT_GREEN = "`^",
  VERY_PALE_PINK = "`&",
  WHITE = "`w",
  DREAMSICLE = "`o",
  PINK = "`p",
  BLACK = "`b",
  DARK_BLUE = "`q",
  MEDIUM_BLUE = "`e",
  PALE_GREEN = "`r",
  MEDIUM_GREEN = "`t",
  DARK_GREY = "`a",
  MED_GREY = "`s",
  VIBRANT_CYAN = "`c",
  BRIGHT_YELLOW = "`ì",
}

/**
 * Represents metadata and color representations for a Growtopia text color code.
 */
export interface TextColorInfo {
  /** The full code string including backtick (e.g. "`0"). */
  code: TextColorCode | string;
  /** The single character identifier after the backtick (e.g. "0"). */
  char: string;
  /** The internal/display name of the color. */
  name: string;
  /** RGB values tuple [r, g, b]. */
  rgb: [number, number, number];
  /** Hex color code string (e.g. "#ffffff"). */
  hex: string;
}

/**
 * Parsed text segment containing colored text and its active color metadata.
 */
export interface TextColorSegment {
  text: string;
  color: TextColorInfo | null;
}

const COLOR_DEFINITIONS: TextColorInfo[] = [
  { code: TextColorCode.DEFAULT, char: "0", name: "Default", rgb: [255, 255, 255], hex: "#ffffff" },
  { code: TextColorCode.LIGHT_CYAN, char: "1", name: "Light cyan", rgb: [173, 244, 255], hex: "#adf4ff" },
  { code: TextColorCode.GREEN, char: "2", name: "Green", rgb: [73, 252, 0], hex: "#49fc00" },
  { code: TextColorCode.LIGHT_BLUE, char: "3", name: "Light blue", rgb: [191, 218, 255], hex: "#bfdaff" },
  { code: TextColorCode.CRAZY_RED, char: "4", name: "Crazy red", rgb: [255, 39, 29], hex: "#ff271d" },
  { code: TextColorCode.PINKY_PURPLE, char: "5", name: "Pinky purple", rgb: [235, 183, 255], hex: "#ebb7ff" },
  { code: TextColorCode.BROWN, char: "6", name: "Brown", rgb: [255, 202, 111], hex: "#ffca6f" },
  { code: TextColorCode.LIGHT_GRAY, char: "7", name: "Light gray", rgb: [230, 230, 230], hex: "#e6e6e6" },
  { code: TextColorCode.CRAZY_ORANGE, char: "8", name: "Crazy orange", rgb: [255, 148, 69], hex: "#ff9445" },
  { code: TextColorCode.YELLOW, char: "9", name: "Yellow", rgb: [255, 238, 125], hex: "#ffee7d" },
  { code: TextColorCode.BRIGHT_CYAN, char: "!", name: "Bright cyan", rgb: [209, 255, 249], hex: "#d1fff9" },
  { code: TextColorCode.BRIGHT_RED_PINK, char: "@", name: "Bright red/pink", rgb: [255, 205, 201], hex: "#ffcdc9" },
  { code: TextColorCode.BRIGHT_PURPLE, char: "#", name: "Bright purple", rgb: [255, 143, 243], hex: "#ff8ff3" },
  { code: TextColorCode.PALE_YELLOW, char: "$", name: "Pale yellow", rgb: [255, 252, 197], hex: "#fffcc5" },
  { code: TextColorCode.LIGHT_GREEN, char: "^", name: "Light green", rgb: [181, 255, 151], hex: "#b5ff97" },
  { code: TextColorCode.VERY_PALE_PINK, char: "&", name: "Very pale pink", rgb: [254, 235, 255], hex: "#feebff" },
  { code: TextColorCode.WHITE, char: "w", name: "White", rgb: [255, 255, 255], hex: "#ffffff" },
  { code: TextColorCode.DREAMSICLE, char: "o", name: "Dreamsicle", rgb: [252, 230, 186], hex: "#fce6ba" },
  { code: TextColorCode.PINK, char: "p", name: "Pink", rgb: [255, 223, 241], hex: "#ffdff1" },
  { code: TextColorCode.BLACK, char: "b", name: "Black", rgb: [0, 0, 0], hex: "#000000" },
  { code: TextColorCode.DARK_BLUE, char: "q", name: "Dark blue", rgb: [12, 96, 164], hex: "#0c60a4" },
  { code: TextColorCode.MEDIUM_BLUE, char: "e", name: "Medium blue", rgb: [25, 185, 255], hex: "#19b9ff" },
  { code: TextColorCode.PALE_GREEN, char: "r", name: "Pale green", rgb: [111, 211, 87], hex: "#6fd357" },
  { code: TextColorCode.MEDIUM_GREEN, char: "t", name: "Medium green", rgb: [47, 131, 13], hex: "#2f830d" },
  { code: TextColorCode.DARK_GREY, char: "a", name: "Dark grey", rgb: [81, 81, 81], hex: "#515151" },
  { code: TextColorCode.MED_GREY, char: "s", name: "Med grey", rgb: [158, 158, 158], hex: "#9e9e9e" },
  { code: TextColorCode.VIBRANT_CYAN, char: "c", name: "Vibrant cyan", rgb: [80, 255, 255], hex: "#50ffff" },
  { code: TextColorCode.BRIGHT_YELLOW, char: "ì", name: "Bright yellow", rgb: [255, 225, 25], hex: "#ffe119" },
];

/** Regular expression matching any Growtopia text color code or color reset */
export const TEXT_COLOR_REGEX = /`([0-9!@#$^&wopbqeartscì`])/gi;

/** Regular expression matching all backtick formatting sequences */
export const ALL_COLOR_TAGS_REGEX = /`./g;

/**
 * Utility class for Growtopia text coloring.
 * Similar to DialogBuilder, it allows chaining colored text elements.
 */
export class TextColor {
  #str = "";

  /** Collection storing text colors indexed by their character identifier (e.g. "0", "w", "c") */
  public static readonly colors: Collection<string, TextColorInfo> = new Collection(COLOR_DEFINITIONS.map((c) => [c.char.toLowerCase(), c]));

  /** Standard color used for Moderator talk/messages (`2 / Green) */
  public static readonly MOD_COLOR = TextColorCode.GREEN;

  /** Standard color used for Developer talk/messages (`5 / Pinky Purple) */
  public static readonly DEV_COLOR = TextColorCode.PINKY_PURPLE;

  /**
   * Initializes a new TextColor builder.
   * @param initialText Optional initial text content.
   */
  constructor(initialText: string = "") {
    this.#str = initialText;
  }

  /**
   * Static factory method to create a new TextColor builder instance.
   * @param initialText Optional initial text content.
   * @returns A new TextColor instance.
   */
  public static builder(initialText: string = ""): TextColor {
    return new TextColor(initialText);
  }

  // --- Fluent Builder Color Methods ---

  /**
   * Appends Default color code (`0) with optional text.
   * @param text Optional text to append.
   */
  public default(text: string = ""): this {
    this.#str += `${TextColorCode.DEFAULT}${text}`;
    return this;
  }

  /**
   * Appends Light cyan color code (`1) with optional text.
   * @param text Optional text to append.
   */
  public lightCyan(text: string = ""): this {
    this.#str += `${TextColorCode.LIGHT_CYAN}${text}`;
    return this;
  }

  /**
   * Appends Green color code (`2) with optional text.
   * @param text Optional text to append.
   */
  public green(text: string = ""): this {
    this.#str += `${TextColorCode.GREEN}${text}`;
    return this;
  }

  /**
   * Appends Light blue color code (`3) with optional text.
   * @param text Optional text to append.
   */
  public lightBlue(text: string = ""): this {
    this.#str += `${TextColorCode.LIGHT_BLUE}${text}`;
    return this;
  }

  /**
   * Appends Crazy red color code (`4) with optional text.
   * @param text Optional text to append.
   */
  public crazyRed(text: string = ""): this {
    this.#str += `${TextColorCode.CRAZY_RED}${text}`;
    return this;
  }

  /**
   * Appends Pinky purple color code (`5) with optional text.
   * @param text Optional text to append.
   */
  public pinkyPurple(text: string = ""): this {
    this.#str += `${TextColorCode.PINKY_PURPLE}${text}`;
    return this;
  }

  /**
   * Appends Brown color code (`6) with optional text.
   * @param text Optional text to append.
   */
  public brown(text: string = ""): this {
    this.#str += `${TextColorCode.BROWN}${text}`;
    return this;
  }

  /**
   * Appends Light gray color code (`7) with optional text.
   * @param text Optional text to append.
   */
  public lightGray(text: string = ""): this {
    this.#str += `${TextColorCode.LIGHT_GRAY}${text}`;
    return this;
  }

  /**
   * Alias for lightGray. Appends Light grey color code (`7) with optional text.
   * @param text Optional text to append.
   */
  public lightGrey(text: string = ""): this {
    return this.lightGray(text);
  }

  /**
   * Appends Crazy orange color code (`8) with optional text.
   * @param text Optional text to append.
   */
  public crazyOrange(text: string = ""): this {
    this.#str += `${TextColorCode.CRAZY_ORANGE}${text}`;
    return this;
  }

  /**
   * Appends Yellow color code (`9) with optional text.
   * @param text Optional text to append.
   */
  public yellow(text: string = ""): this {
    this.#str += `${TextColorCode.YELLOW}${text}`;
    return this;
  }

  /**
   * Appends Bright cyan color code (`!) with optional text.
   * @param text Optional text to append.
   */
  public brightCyan(text: string = ""): this {
    this.#str += `${TextColorCode.BRIGHT_CYAN}${text}`;
    return this;
  }

  /**
   * Appends Bright red/pink color code (`@) with optional text.
   * @param text Optional text to append.
   */
  public brightRedPink(text: string = ""): this {
    this.#str += `${TextColorCode.BRIGHT_RED_PINK}${text}`;
    return this;
  }

  /**
   * Appends Bright purple color code (`#) with optional text.
   * @param text Optional text to append.
   */
  public brightPurple(text: string = ""): this {
    this.#str += `${TextColorCode.BRIGHT_PURPLE}${text}`;
    return this;
  }

  /**
   * Appends Pale yellow color code (`$) with optional text.
   * @param text Optional text to append.
   */
  public paleYellow(text: string = ""): this {
    this.#str += `${TextColorCode.PALE_YELLOW}${text}`;
    return this;
  }

  /**
   * Appends Light green color code (`^) with optional text.
   * @param text Optional text to append.
   */
  public lightGreen(text: string = ""): this {
    this.#str += `${TextColorCode.LIGHT_GREEN}${text}`;
    return this;
  }

  /**
   * Appends Very pale pink color code (`&) with optional text.
   * @param text Optional text to append.
   */
  public veryPalePink(text: string = ""): this {
    this.#str += `${TextColorCode.VERY_PALE_PINK}${text}`;
    return this;
  }

  /**
   * Appends White color code (`w) with optional text.
   * @param text Optional text to append.
   */
  public white(text: string = ""): this {
    this.#str += `${TextColorCode.WHITE}${text}`;
    return this;
  }

  /**
   * Appends Dreamsicle color code (`o) with optional text.
   * @param text Optional text to append.
   */
  public dreamsicle(text: string = ""): this {
    this.#str += `${TextColorCode.DREAMSICLE}${text}`;
    return this;
  }

  /**
   * Appends Pink color code (`p) with optional text.
   * @param text Optional text to append.
   */
  public pink(text: string = ""): this {
    this.#str += `${TextColorCode.PINK}${text}`;
    return this;
  }

  /**
   * Appends Black color code (`b) with optional text.
   * @param text Optional text to append.
   */
  public black(text: string = ""): this {
    this.#str += `${TextColorCode.BLACK}${text}`;
    return this;
  }

  /**
   * Appends Dark blue color code (`q) with optional text.
   * @param text Optional text to append.
   */
  public darkBlue(text: string = ""): this {
    this.#str += `${TextColorCode.DARK_BLUE}${text}`;
    return this;
  }

  /**
   * Appends Medium blue color code (`e) with optional text.
   * @param text Optional text to append.
   */
  public mediumBlue(text: string = ""): this {
    this.#str += `${TextColorCode.MEDIUM_BLUE}${text}`;
    return this;
  }

  /**
   * Appends Pale green color code (`r) with optional text.
   * @param text Optional text to append.
   */
  public paleGreen(text: string = ""): this {
    this.#str += `${TextColorCode.PALE_GREEN}${text}`;
    return this;
  }

  /**
   * Appends Medium green color code (`t) with optional text.
   * @param text Optional text to append.
   */
  public mediumGreen(text: string = ""): this {
    this.#str += `${TextColorCode.MEDIUM_GREEN}${text}`;
    return this;
  }

  /**
   * Appends Dark grey color code (`a) with optional text.
   * @param text Optional text to append.
   */
  public darkGrey(text: string = ""): this {
    this.#str += `${TextColorCode.DARK_GREY}${text}`;
    return this;
  }

  /**
   * Alias for darkGrey. Appends Dark gray color code (`a) with optional text.
   * @param text Optional text to append.
   */
  public darkGray(text: string = ""): this {
    return this.darkGrey(text);
  }

  /**
   * Appends Medium grey color code (`s) with optional text.
   * @param text Optional text to append.
   */
  public medGrey(text: string = ""): this {
    this.#str += `${TextColorCode.MED_GREY}${text}`;
    return this;
  }

  /**
   * Alias for medGrey. Appends Medium gray color code (`s) with optional text.
   * @param text Optional text to append.
   */
  public medGray(text: string = ""): this {
    return this.medGrey(text);
  }

  /**
   * Appends Vibrant cyan color code (`c) with optional text.
   * @param text Optional text to append.
   */
  public vibrantCyan(text: string = ""): this {
    this.#str += `${TextColorCode.VIBRANT_CYAN}${text}`;
    return this;
  }

  /**
   * Appends Bright yellow color code (`ì) with optional text.
   * @param text Optional text to append.
   */
  public brightYellow(text: string = ""): this {
    this.#str += `${TextColorCode.BRIGHT_YELLOW}${text}`;
    return this;
  }

  /**
   * Appends Moderator color (`2 / Green) with optional text.
   * @param text Optional text to append.
   */
  public mod(text: string = ""): this {
    this.#str += `${TextColor.MOD_COLOR}${text}`;
    return this;
  }

  /**
   * Appends Developer color (`5 / Pinky Purple) with optional text.
   * @param text Optional text to append.
   */
  public dev(text: string = ""): this {
    this.#str += `${TextColor.DEV_COLOR}${text}`;
    return this;
  }

  /**
   * Appends custom color code or character with optional text.
   * @param color The TextColorCode or single char (e.g. "`2" or "2").
   * @param text Optional text to append.
   */
  public add(color: TextColorCode | string, text: string = ""): this {
    const prefix = color.startsWith("`") ? color : `\`${color}`;
    this.#str += `${prefix}${text}`;
    return this;
  }

  /**
   * Appends raw text without adding any color code.
   * @param str The raw text to append.
   */
  public raw(str: string): this {
    this.#str += str;
    return this;
  }

  /**
   * Appends text with color reset tag at the end (defaults to `0).
   * @param color Color code to apply.
   * @param text Text content.
   * @param resetColor Color code to reset to (default: `0).
   */
  public block(color: TextColorCode | string, text: string, resetColor: TextColorCode | string = TextColorCode.DEFAULT): this {
    const prefix = color.startsWith("`") ? color : `\`${color}`;
    const reset = resetColor.startsWith("`") ? resetColor : `\`${resetColor}`;
    this.#str += `${prefix}${text}${reset}`;
    return this;
  }

  /**
   * Appends a newline character (`\n`) to the string.
   */
  public newLine(): this {
    this.#str += "\n";
    return this;
  }

  /**
   * Returns the constructed formatted string.
   * @returns Formatted Growtopia text string.
   */
  public str(): string {
    return this.#str;
  }

  /**
   * Returns the constructed formatted string.
   * @returns Formatted Growtopia text string.
   */
  public toString(): string {
    return this.#str;
  }

  /**
   * Clears and resets the builder string.
   * @returns The builder instance for chaining.
   */
  public reconstruct(): this {
    this.#str = "";
    return this;
  }

  // --- Static Helper Methods ---

  /**
   * Helper to quickly create a Green formatted text string.
   * @param text Text content.
   */
  public static green(text: string = ""): string {
    return new TextColor().green(text).str();
  }

  /**
   * Helper to quickly create a Crazy Red formatted text string.
   * @param text Text content.
   */
  public static crazyRed(text: string = ""): string {
    return new TextColor().crazyRed(text).str();
  }

  /**
   * Helper to quickly create a White formatted text string.
   * @param text Text content.
   */
  public static white(text: string = ""): string {
    return new TextColor().white(text).str();
  }

  /**
   * Helper to quickly create a Yellow formatted text string.
   * @param text Text content.
   */
  public static yellow(text: string = ""): string {
    return new TextColor().yellow(text).str();
  }

  /**
   * Helper to quickly create a Light Blue formatted text string.
   * @param text Text content.
   */
  public static lightBlue(text: string = ""): string {
    return new TextColor().lightBlue(text).str();
  }

  /**
   * Helper to quickly create a Light Cyan formatted text string.
   * @param text Text content.
   */
  public static lightCyan(text: string = ""): string {
    return new TextColor().lightCyan(text).str();
  }

  /**
   * Helper to quickly create a Pinky Purple formatted text string.
   * @param text Text content.
   */
  public static pinkyPurple(text: string = ""): string {
    return new TextColor().pinkyPurple(text).str();
  }

  /**
   * Helper to quickly create a Moderator colored text string.
   * @param text Text content.
   */
  public static mod(text: string = ""): string {
    return new TextColor().mod(text).str();
  }

  /**
   * Helper to quickly create a Developer colored text string.
   * @param text Text content.
   */
  public static dev(text: string = ""): string {
    return new TextColor().dev(text).str();
  }

  /**
   * Retrieves color information for a given code or character identifier.
   * @param codeOrChar The color code (e.g. "`2", "2", "`w", "w")
   * @returns The TextColorInfo object or undefined if not found
   */
  public static get(codeOrChar: string): TextColorInfo | undefined {
    if (!codeOrChar) return undefined;
    const cleanKey = codeOrChar.startsWith("`") ? codeOrChar.slice(1).toLowerCase() : codeOrChar.toLowerCase();
    return this.colors.get(cleanKey);
  }

  /**
   * Converts a color code or character to a Color instance.
   * @param codeOrChar The color code or char (e.g. "`2", "2")
   * @returns A Color instance (BGRA) or undefined if not found
   */
  public static toColor(codeOrChar: string): Color | undefined {
    const info = this.get(codeOrChar);
    if (!info) return undefined;
    const [r, g, b] = info.rgb;
    return new Color(r, g, b, 255);
  }

  /**
   * Retrieves the HEX code for a given color code or character.
   * @param codeOrChar The color code or char (e.g. "`1", "1")
   * @returns Hex string (e.g. "#adf4ff") or undefined if not found
   */
  public static toHex(codeOrChar: string): string | undefined {
    return this.get(codeOrChar)?.hex;
  }

  /**
   * Retrieves the RGB tuple for a given color code or character.
   * @param codeOrChar The color code or char (e.g. "`1", "1")
   * @returns RGB tuple [r, g, b] or undefined if not found
   */
  public static toRgb(codeOrChar: string): [number, number, number] | undefined {
    return this.get(codeOrChar)?.rgb;
  }

  /**
   * Strips all Growtopia color tags from the string.
   * @param text The input string containing color tags
   * @param strict Whether to only strip recognized color codes (default: true)
   * @returns Clean string without color tags
   */
  public static clean(text: string, strict: boolean = true): string {
    if (!text) return "";
    return strict ? text.replace(TEXT_COLOR_REGEX, "") : text.replace(ALL_COLOR_TAGS_REGEX, "");
  }

  /**
   * Alias for clean(). Strips all Growtopia color tags from the string.
   * @param text The input string containing color tags
   * @param strict Whether to only strip recognized color codes (default: true)
   * @returns Clean string without color tags
   */
  public static strip(text: string, strict: boolean = true): string {
    return this.clean(text, strict);
  }

  /**
   * Wraps text with a Growtopia color code and resets it back at the end.
   * @param text The text to colorize
   * @param color The TextColorCode or color character to prefix
   * @param resetCode The color code to reset to at the end (default: "`0")
   * @returns Colorized text string
   */
  public static colorize(text: string, color: TextColorCode | string, resetCode: TextColorCode | string = TextColorCode.DEFAULT): string {
    const prefix = color.startsWith("`") ? color : `\`${color}`;
    const suffix = resetCode.startsWith("`") ? resetCode : `\`${resetCode}`;
    return `${prefix}${text}${suffix}`;
  }

  /**
   * Parses a formatted string into an array of text segments with their respective color metadata.
   * @param text The input string containing color tags
   * @returns Array of TextColorSegment objects
   */
  public static parse(text: string): TextColorSegment[] {
    if (!text) return [];

    const segments: TextColorSegment[] = [];
    const regex = /`([0-9!@#$^&wopbqeartscì`])/gi;
    let currentColor: TextColorInfo | null = null;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, matchIndex),
          color: currentColor,
        });
      }

      const char = match[1]!;
      if (char === "`") {
        currentColor = null;
      } else {
        currentColor = this.get(char) ?? null;
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
        color: currentColor,
      });
    }

    return segments;
  }

  /**
   * Converts Growtopia color tags into ANSI 24-bit TrueColor sequences for terminal output.
   * @param text The input string containing color tags
   * @returns ANSI formatted string
   */
  public static toAnsi(text: string): string {
    if (!text) return "";

    const segments = this.parse(text);
    return segments
      .map((segment) => {
        if (!segment.color) {
          return `\x1b[0m${segment.text}`;
        }
        const [r, g, b] = segment.color.rgb;
        return `\x1b[38;2;${r};${g};${b}m${segment.text}\x1b[0m`;
      })
      .join("");
  }

  /**
   * Converts Growtopia color tags into HTML spans with inline CSS styles.
   * @param text The input string containing color tags
   * @returns HTML string
   */
  public static toHtml(text: string): string {
    if (!text) return "";

    const segments = this.parse(text);
    return segments
      .map((segment) => {
        const escaped = segment.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

        if (!segment.color) {
          return escaped;
        }

        return `<span style="color: ${segment.color.hex};">${escaped}</span>`;
      })
      .join("");
  }

  /**
   * Finds the closest or matching TextColorInfo from a Hex color string.
   * @param hex The hex color string (e.g. "#49fc00" or "49fc00")
   * @returns TextColorInfo or undefined if not found
   */
  public static fromHex(hex: string): TextColorInfo | undefined {
    if (!hex) return undefined;
    const normalized = hex.startsWith("#") ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
    return this.colors.find((c) => c.hex.toLowerCase() === normalized);
  }
}
