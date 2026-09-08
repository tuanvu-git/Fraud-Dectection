/**
 * Build a collision-proof composite map key from field values.
 *
 * A plain `a + "|" + b` join is ambiguous when a value itself contains the
 * delimiter (`"x|y" + "z"` collides with `"x" + "y|z"`). Serializing the parts as
 * a JSON array is unambiguous: JSON escapes quotes/backslashes and the array
 * brackets keep field boundaries explicit.
 */
export function compositeKey(...parts: (string | number | boolean)[]): string {
  return JSON.stringify(parts);
}
