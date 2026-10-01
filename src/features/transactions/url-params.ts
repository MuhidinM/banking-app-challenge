/**
 * Reads an id from a search param such as `?account=1` or `?tx=117`. Returns
 * null when it is missing or not a positive whole number, so a mistyped link
 * shows the page without it instead of a request for a nonsense id.
 */
export function readIdParam(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
