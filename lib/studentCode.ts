/**
 * Normalize a student code from a barcode or form input. If VLU has a prefix
 * rule (for example 237…, 217…, or 227…), add it here after confirming it;
 * this function intentionally does not invent a prefix rule.
 */
export function normalizeStudentCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F-\u009F\s\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "");
}

export function isValidStudentCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{13}$/.test(value);
}

export function getValidStudentCode(value: unknown): string | null {
  const normalized = normalizeStudentCode(value);
  return isValidStudentCode(normalized) ? normalized : null;
}
