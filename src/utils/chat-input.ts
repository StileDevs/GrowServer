/** Reads one client input line without terminators, formatting codes, or invisible transport characters. */
export function normalizeChatInput(input: string): string {
  // Stop at a corrupt byte marker; deleting it would glue trailing junk to a name.
  const line = input.split(/[\u0000-\u0008\u000a-\u001f\u007f-\u009f\ufffd]/, 1)[0] ?? "";
  return line
    .replace(/`./g, "")
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd\p{Cf}]/gu, "")
    .trim();
}
