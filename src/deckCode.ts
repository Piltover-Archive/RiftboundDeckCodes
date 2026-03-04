import { SET_MAP, VARIANT_MAP } from "./mappings";
import type {
  Deck,
  Card,
  SetVariantGroup,
  DeckWithSideboard,
  DecodeOptions,
} from "./types";
import VarintTranslator from "./VarintTranslator";

const FORMAT = 1;
const VERSION = 4;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encodes a byte array to base32 string
 */
function base32Encode(bytes: Uint8Array): string {
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += BASE32_ALPHABET[(buffer >> bitsLeft) & 0x1f];
    }
  }

  if (bitsLeft > 0) {
    buffer <<= 5 - bitsLeft;
    result += BASE32_ALPHABET[buffer & 0x1f];
  }

  return result;
}

/**
 * Decodes a base32 string to byte array
 */
function base32Decode(str: string): Uint8Array {
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const char of str) {
    const value = BASE32_ALPHABET.indexOf(char.toUpperCase());
    if (value === -1) {
      throw new Error(`Invalid character in deck code: '${char}'`);
    }

    buffer = (buffer << 5) | value;
    bitsLeft += 5;

    while (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Parses a Riftbound card code into its components
 * @param cardCode - Card code in format "SET-NUMBERvariant" (e.g., "OGN-007a")
 * @returns Object containing set, number, and variant
 * @throws Error if card code format is invalid
 */
function parseCardCode(cardCode: string): {
  set: string;
  number: string;
  variant: string;
} {
  const parts = cardCode.split("-");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid card code format: ${cardCode}. Expected format: SET-NUMBERvariant`
    );
  }

  const set = parts[0];
  const rest = parts[1];
  if (!set || !rest) {
    throw new Error(
      `Invalid card code format: ${cardCode}. Missing set or card number.`
    );
  }

  const match = rest.match(/^(R?\d+)([a-z*]?)$/);
  if (!match) {
    throw new Error(
      `Invalid card code format: ${cardCode}. Expected format: SET-NUMBERvariant`
    );
  }

  return {
    set,
    number: match[1] ?? "",
    variant: match[2] ?? "",
  };
}

/**
 * Groups cards by set and variant for efficient encoding
 */
function groupBySetAndVariant(cards: Card[]): SetVariantGroup[] {
  const groups = new Map<string, SetVariantGroup>();

  for (const card of cards) {
    const { set, number, variant } = parseCardCode(card.cardCode);
    const key = `${set}-${variant}`;

    if (!groups.has(key)) {
      const setValue = SET_MAP[set];
      if (setValue === undefined) {
        throw new Error(
          `Unknown set: ${set}. Valid sets: ${Object.keys(SET_MAP).join(", ")}`
        );
      }

      const variantValue = VARIANT_MAP[variant];
      if (variantValue === undefined) {
        throw new Error(
          `Unknown variant: '${variant}'. Valid variants: ${Object.keys(
            VARIANT_MAP
          ).join(", ")}`
        );
      }

      groups.set(key, {
        set: setValue,
        variant: variantValue,
        cardNumbers: [],
      });
    }

    groups.get(key)!.cardNumbers.push(number);
  }

  return Array.from(groups.values())
    .sort((a, b) => {
      if (a.set !== b.set) return a.set - b.set;
      if (a.variant !== b.variant) return a.variant - b.variant;
      return 0;
    })
    .map((group) => ({
      ...group,
      cardNumbers: group.cardNumbers.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    }));
}

/**
 * Encodes a deck section into bytes
 * @param deck - The deck to encode
 * @param maxCount - Maximum count to process (12 for main deck, 3 for sideboard)
 */
function encodeDeckSection(
  deck: Deck,
  maxCount: number = 12,
  version: number = 4
): number[] {
  const bytes: number[] = [];

  // Process counts from maxCount down to 1
  for (let count = maxCount; count >= 1; count--) {
    const cards = deck.filter((card) => card.count === count);
    const setVariantGroups = groupBySetAndVariant(cards);

    // Write number of set/variant groups
    bytes.push(...VarintTranslator.GetVarint(setVariantGroups.length));

    // Write each set/variant group
    for (const group of setVariantGroups) {
      bytes.push(...VarintTranslator.GetVarint(group.cardNumbers.length));
      bytes.push(group.set);
      bytes.push(group.variant);

      // Write card numbers
      for (const cardNumber of group.cardNumbers) {
        if (version >= 4) {
          if (cardNumber.startsWith("R")) {
            bytes.push(0x01); // Rune flag
            bytes.push(
              ...VarintTranslator.GetVarint(parseInt(cardNumber.slice(1)))
            );
          } else {
            bytes.push(0x00); // Normal card flag
            bytes.push(...VarintTranslator.GetVarint(parseInt(cardNumber)));
          }
        } else {
          bytes.push(...VarintTranslator.GetVarint(parseInt(cardNumber)));
        }
      }
    }
  }

  return bytes;
}

/**
 * Decodes a deck section from bytes
 * @param translator - The varint translator
 * @param maxCount - Maximum count to process (12 for main deck, 3 for sideboard)
 * @param signedSuffix - The suffix to use for signed cards ('s' or '*')
 */
function decodeDeckSection(
  translator: VarintTranslator,
  maxCount: number = 12,
  signedSuffix: "s" | "*" = "s",
  version: number = 4
): Deck {
  const deck: Deck = [];

  // Process counts from maxCount down to 1
  for (let count = maxCount; count >= 1; count--) {
    const numGroups = translator.PopVarint();

    for (let i = 0; i < numGroups; i++) {
      const numCards = translator.PopVarint();
      const set = translator.get(0);
      const variant = translator.get(1);
      translator.sliceAndSet(2);

      const setCode = Object.entries(SET_MAP).find(
        ([_, value]) => value === set
      )?.[0];

      // For signed cards (variant 2), use the signedSuffix option
      let variantCode: string | undefined;
      if (variant === 2) {
        variantCode = signedSuffix;
      } else {
        variantCode = Object.entries(VARIANT_MAP).find(
          ([_, value]) => value === variant
        )?.[0];
      }

      if (!setCode) {
        throw new Error(`Unknown set code: ${set}`);
      }

      for (let j = 0; j < numCards; j++) {
        let cardNumberStr: string;

        if (version >= 4) {
          const isRune = translator.get(0);
          translator.sliceAndSet(1);
          const num = translator.PopVarint();

          if (isRune === 0x01) {
            cardNumberStr = `R${num.toString().padStart(2, "0")}`;
          } else {
            cardNumberStr = num.toString().padStart(3, "0");
          }
        } else {
          const num = translator.PopVarint();
          cardNumberStr = num.toString().padStart(3, "0");
        }

        deck.push({
          cardCode: `${setCode}-${cardNumberStr}${variantCode || ""}`,
          count,
        });
      }
    }
  }

  return deck;
}

/**
 * Encodes a Riftbound deck into a shareable deck code
 * @param mainDeck - The main deck cards
 * @param sideboard - Optional sideboard cards (defaults to empty array)
 * @param chosenChampion - Optional chosen champion card code (e.g., "OGN-007")
 * @returns Base32-encoded deck code string
 * @throws Error if deck format is invalid
 */
export function getCodeFromDeck(
  mainDeck: Deck,
  sideboard: Deck = [],
  chosenChampion?: string
): string {
  // Determine if any card has an R-prefix number
  const hasRuneCode = (code: string) => {
    const { number } = parseCardCode(code);
    return number.startsWith("R");
  };
  const needsV4 =
    mainDeck.some((c) => hasRuneCode(c.cardCode)) ||
    sideboard.some((c) => hasRuneCode(c.cardCode)) ||
    (chosenChampion !== undefined && hasRuneCode(chosenChampion));
  const version = needsV4 ? 4 : 3;

  const bytes: number[] = [];

  // Write format and version
  bytes.push((FORMAT << 4) | version);

  // Encode main deck (counts 1-12)
  bytes.push(...encodeDeckSection(mainDeck, 12, version));

  // Encode sideboard (counts 1-3 only, since sideboards can't have runes/battlefields)
  bytes.push(...encodeDeckSection(sideboard, 3, version));

  // Encode chosen champion (version 3+)
  if (chosenChampion) {
    const { set, number, variant } = parseCardCode(chosenChampion);
    const setValue = SET_MAP[set];
    if (setValue === undefined) {
      throw new Error(
        `Unknown set in chosen champion: ${set}. Valid sets: ${Object.keys(SET_MAP).join(", ")}`
      );
    }
    const variantValue = VARIANT_MAP[variant];
    if (variantValue === undefined) {
      throw new Error(
        `Unknown variant in chosen champion: '${variant}'. Valid variants: ${Object.keys(VARIANT_MAP).join(", ")}`
      );
    }
    bytes.push(0x01); // Champion present flag
    bytes.push(setValue);
    bytes.push(variantValue);
    if (version >= 4 && number.startsWith("R")) {
      bytes.push(0x01); // Rune flag
      bytes.push(...VarintTranslator.GetVarint(parseInt(number.slice(1))));
    } else if (version >= 4) {
      bytes.push(0x00); // Normal card flag
      bytes.push(...VarintTranslator.GetVarint(parseInt(number)));
    } else {
      bytes.push(...VarintTranslator.GetVarint(parseInt(number)));
    }
  } else {
    bytes.push(0x00); // No champion flag
  }

  return base32Encode(new Uint8Array(bytes));
}

/**
 * Decodes a Riftbound deck code into deck and sideboard
 * @param code - Base32-encoded deck code string
 * @param options - Optional decode options
 * @returns Object containing mainDeck and sideboard arrays
 * @throws Error if code is invalid or unsupported
 */
export function getDeckFromCode(
  code: string,
  options?: DecodeOptions
): DeckWithSideboard {
  const signedSuffix = options?.signedSuffix ?? "s";
  const bytes = base32Decode(code);
  const translator = new VarintTranslator(bytes);

  // Read format and version
  const formatVersion = translator.get(0);
  translator.sliceAndSet(1);

  const format = (formatVersion >> 4) & 0x0f;
  const version = formatVersion & 0x0f;

  if (format !== FORMAT) {
    throw new Error(
      `Unsupported format: ${format}. Expected format: ${FORMAT}`
    );
  }

  if (version > VERSION) {
    throw new Error(
      `Unsupported version: ${version}. Maximum supported version: ${VERSION}`
    );
  }

  // Decode main deck (counts 1-12)
  const mainDeck = decodeDeckSection(translator, 12, signedSuffix, version);

  // Decode sideboard (counts 1-3 only)
  // Version 1 codes don't have sideboard section, version 2+ do
  let sideboard: Deck = [];
  if (version >= 2) {
    sideboard = decodeDeckSection(translator, 3, signedSuffix, version);
  }

  // Decode chosen champion (version 3+ only)
  let chosenChampion: string | undefined;
  if (version >= 3) {
    const hasChampion = translator.get(0);
    translator.sliceAndSet(1);

    if (hasChampion === 0x01) {
      const set = translator.get(0);
      const variant = translator.get(1);
      translator.sliceAndSet(2);

      let cardNumberStr: string;
      if (version >= 4) {
        const isRune = translator.get(0);
        translator.sliceAndSet(1);
        const num = translator.PopVarint();
        if (isRune === 0x01) {
          cardNumberStr = `R${num.toString().padStart(2, "0")}`;
        } else {
          cardNumberStr = num.toString().padStart(3, "0");
        }
      } else {
        const num = translator.PopVarint();
        cardNumberStr = num.toString().padStart(3, "0");
      }

      const setCode = Object.entries(SET_MAP).find(
        ([_, value]) => value === set
      )?.[0];

      if (!setCode) {
        throw new Error(`Unknown set code in champion: ${set}`);
      }

      // For signed cards (variant 2), use the signedSuffix option
      let variantCode: string | undefined;
      if (variant === 2) {
        variantCode = signedSuffix;
      } else {
        variantCode = Object.entries(VARIANT_MAP).find(
          ([_, value]) => value === variant
        )?.[0];
      }

      chosenChampion = `${setCode}-${cardNumberStr}${variantCode || ""}`;
    }
  }

  return {
    mainDeck,
    sideboard,
    chosenChampion,
  };
}

