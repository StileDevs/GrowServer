import { Collection } from "../../utils/collection";

/**
 * Chat emoticons known to the 5.x client: name to the private-use glyph the
 * client renders. Sent with OnEmoticonDataChanged so the chat emoticon panel
 * and `(name)` substitution work.
 */
export const EMOTICONS: Collection<string, string> = new Collection([
  ["smile", "Ā"],
  ["wl", "ā"],
  ["yes", "Ă"],
  ["no", "ă"],
  ["love", "Ą"],
  ["oops", "ą"],
  ["shy", "Ć"],
  ["wink", "ć"],
  ["tongue", "Ĉ"],
  ["agree", "ĉ"],
  ["sleep", "Ċ"],
  ["punch", "ċ"],
  ["music", "Č"],
  ["build", "č"],
  ["megaphone", "Ď"],
  ["sigh", "ď"],
  ["mad", "Đ"],
  ["wow", "đ"],
  ["dance", "Ē"],
  ["see-no-evil", "ē"],
  ["bheart", "Ĕ"],
  ["heart", "ĕ"],
  ["grow", "Ė"],
  ["gems", "ė"],
  ["kiss", "Ę"],
  ["gtoken", "ę"],
  ["lol", "Ě"],
  ["cool", "Ĝ"],
  ["cry", "ĝ"],
  ["vend", "Ğ"],
  ["bunny", "ğ"],
  ["cactus", "Ġ"],
  ["pine", "ġ"],
  ["peace", "Ģ"],
  ["terror", "ģ"],
  ["troll", "Ĥ"],
  ["evil", "ĥ"],
  ["fireworks", "Ħ"],
  ["football", "ħ"],
  ["alien", "Ĩ"],
  ["party", "ĩ"],
  ["pizza", "Ī"],
  ["clap", "ī"],
  ["song", "Ĭ"],
  ["ghost", "ĭ"],
  ["nuke", "Į"],
  ["halo", "į"],
  ["turkey", "İ"],
  ["gift", "ı"],
  ["cake", "Ĳ"],
  ["heartarrow", "ĳ"],
  ["lucky", "Ĵ"],
  ["shamrock", "ĵ"],
  ["grin", "Ķ"],
  ["ill", "ķ"],
  ["eyes", "ĸ"],
  ["weary", "Ĺ"],
  ["moyai", "ĺ"],
  ["plead", "Ļ"],
  ["fire", "ľ"],
  ["flirty", "Ŀ"],
  ["lightbulb", "ŀ"],
  ["moneymouth", "Ł"],
  ["nerd", "ł"],
  ["skull", "Ń"],
  ["trophy", "ń"],
  ["wilted", "Ņ"],
]);

/** Version tag the client compares to decide whether to refresh its emoticon list. */
export const EMOTICON_DATA_VERSION = 201560520;

/**
 * Builds the OnEmoticonDataChanged payload: `(name)|glyph|unlocked&` per emoticon.
 */
export function buildEmoticonData(): string {
  let data = "";
  for (const [name, glyph] of EMOTICONS) data += `(${name})|${glyph}|1&`;
  return data;
}
