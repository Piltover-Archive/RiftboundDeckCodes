/**
 * Mapping of set codes to their numeric identifiers
 * Format: SET_CODE -> numeric_id
 */
export const SET_MAP: Record<string, number> = {
  OGN: 0,
  OGS: 1,
  ARC: 2,
  SFD: 3,
  UNL: 4,
};

/**
 * Mapping of variant codes to their numeric identifiers
 * Format: variant_suffix -> numeric_id
 * Empty string represents the base/default variant
 */
export const VARIANT_MAP: Record<string, number> = {
  "": 0, // Base variant (no suffix)
  a: 1,
  s: 2,
  "*": 2, // Alternative signed notation
  b: 3,
};
