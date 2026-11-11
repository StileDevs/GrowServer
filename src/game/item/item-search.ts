import type { ItemDefinition } from "grow-items";
import { normalizeChatInput } from "../../utils/chat-input";

/** Searches literal item names first; retries one trailing character only when no literal matches exist. */
export function searchItemNames(definitions: Iterable<ItemDefinition>, input: string, seedsOnly = false): {
  query: string;
  corrected: boolean;
  matches: ItemDefinition[];
} {
  const query = normalizeChatInput(input).toLowerCase();
  if (!query) return { query, corrected: false, matches: [] };
  const candidates = [...definitions].filter((item) => (item.id ?? 0) > 0 && (seedsOnly ? item.id! % 2 === 1 : item.id! % 2 === 0));
  const find = (needle: string) => candidates.filter((item) => item.name?.toLowerCase().includes(needle)).slice(0, 100);
  const matches = find(query);
  if (matches.length) return { query, corrected: false, matches };
  const shortened = Array.from(query).slice(0, -1).join("").trimEnd();
  if (shortened.length >= 3) {
    const retry = find(shortened);
    if (retry.length) return { query: shortened, corrected: true, matches: retry };
  }
  return { query, corrected: false, matches };
}
