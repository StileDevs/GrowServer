/** Decodes only the valid text prefix, excluding null terminators and corrupt trailing data. */
export function decodeTextPacket(data: Uint8Array): string {
  const terminator = data.indexOf(0, 4);
  const decoded = Buffer.from(data.subarray(4, terminator < 0 ? data.length : terminator)).toString("utf8");
  // Preserve protocol line separators. A bad byte ends the payload instead of
  // concatenating printable garbage after it into the preceding field.
  return decoded.split(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ufffd]/, 1)[0] ?? "";
}
