<div align="center">
  <img src="https://cdn.piltoverarchive.com/PiltoverArchive.webp" alt="Piltover Archive" width="200"/>

  # RiftboundDeckCodes

  **By [Piltover Archive](https://piltoverarchive.com)**
</div>

The RiftboundDeckCodes library can be used to encode/decode Riftbound TCG decks to/from simple strings. Below is an example code for a Kai'Sa deck with sideboard.

```
CIAAAAAAAAAQCAAAA4AACAIAABMQAAILAAAAICIMDMOVOX3AM5UHIAIDAAACO6XYAEAQKAAABX3QDGACUABKIAQAAEBQAAAWDBOQCAQAABMHE
```

These strings can be used to share decks across Riftbound TCG applications and the PiltoverArchive companion app.

## Cards & Decks

Every Riftbound TCG card has a corresponding card code. Card codes are comprised of a three-character set identifier, a three-digit card number, and an optional single-character variant suffix.

```
OGN-007a
│   │  └ variant - a
│   └ card number - 007
└ set - OGN
```

The deck code library accepts a Riftbound deck as a list of `Card` objects. This is simply the card code and an associated integer for the number of occurrences of the card in the deck.

## Process

Decks are encoded via arranging VarInts (big endian) into an array and then base32 encoding into a string.

All encodings begin with 4 bits for format and 4 bits for version.

| Format | Version | Date              | About                                                                     |
| ------ | ------- | ----------------- | ------------------------------------------------------------------------- |
| 1      | 1       | April 1, 2025     | Initial release. Supports main deck encoding.                             |
| 1      | 2       | November 20, 2025 | Adds sideboard support.                                                   |
| 1      | 3       | January 10, 2026  | Adds chosen champion support. All new codes encode as V3.                 |

The list of cards are then encoded according to the following scheme:

1. Cards are grouped together based on how many copies of the card are in the deck (e.g., cards with twelve copies, cards with three copies, cards with two copies, and cards with a single copy are grouped together).
2. Within those groups, lists of cards are created which share the same set AND variant.
3. The set/variant lists are ordered by increasing length. The contents of the set/variant lists are ordered alphanumerically by card number.
4. Variable length integer ([varints](https://en.wikipedia.org/wiki/Variable-length_quantity)) (big endian) bytes for each ordered group of cards are written into the byte array according to the following convention:
   - [how many lists of set/variant combination have twelve copies of a card]
     - [how many cards within this set/variant combination follow]
     - [set]
     - [variant]
       - [card number]
       - [card number]
       - ...
     - [how many cards in this next set/variant combination follow]
     - [set]
     - [variant]
       - [card number]
       - [card number]
       - ...
   - [repeat for the groups of eleven copies of a card]
   - [repeat down to groups of a single copy of a card]
5. For Version 2 decks, the sideboard is encoded using the same scheme after the main deck, but **only processes counts 3, 2, and 1** (since sideboards cannot contain runes which may have higher counts). This optimization reduces sideboard encoding size by ~12%.
6. The resulting byte array is base32 encoded into a string.

### Set Identifiers

Sets are mapped as follows:

| Version | Integer Identifier | Set Code | Set Name        |
| ------- | ------------------ | -------- | --------------- |
| 1       | 0                  | OGN      | Origins         |
| 1       | 1                  | OGS      | Proving Grounds |
| 2       | 2                  | ARC      | Arcane Box Set  |
| 2       | 3                  | SFD      | Spiritforged    |

### Variant Identifiers

Variants are mapped as follows:

| Version | Integer Identifier | Variant Code | Variant Name    |
| ------- | ------------------ | ------------ | --------------- |
| 1       | 0                  | (none)       | Base variant    |
| 1       | 1                  | a            | Alternate art A |
| 1       | 2                  | s or \*      | Signed          |
| 2       | 3                  | b            | Alternate art B |

> **Note:** Both `s` and `*` are valid suffixes for signed cards (e.g., `OGN-007s` and `OGN-007*` are equivalent). When decoding, `s` is used by default. See [Decoding Options](#decoding-options) for customization.

## Installation

```bash
npm install @piltoverarchive/riftbound-deck-codes
```

Or using other package managers:

```bash
yarn add @piltoverarchive/riftbound-deck-codes
pnpm add @piltoverarchive/riftbound-deck-codes
```

## Usage

### Encoding a Deck

```typescript
import { getCodeFromDeck } from "@piltoverarchive/riftbound-deck-codes";
import type { Deck } from "@piltoverarchive/riftbound-deck-codes";

// Kai'Sa deck
const mainDeck: Deck = [
  { cardCode: "OGN-007", count: 7 },
  { cardCode: "OGN-089", count: 5 },
  { cardCode: "OGN-004", count: 3 },
  { cardCode: "OGN-009", count: 3 },
  { cardCode: "OGN-012", count: 3 },
  { cardCode: "OGN-027", count: 3 },
  { cardCode: "OGN-029", count: 3 },
  { cardCode: "OGN-087", count: 3 },
  { cardCode: "OGN-095", count: 3 },
  { cardCode: "OGN-096", count: 3 },
  { cardCode: "OGN-103", count: 3 },
  { cardCode: "OGN-104", count: 3 },
  { cardCode: "OGN-116", count: 3 },
  { cardCode: "OGN-039", count: 2 },
  { cardCode: "OGN-122", count: 2 },
  { cardCode: "OGN-248", count: 2 },
  { cardCode: "OGN-013", count: 1 },
  { cardCode: "OGN-247", count: 1 },
  { cardCode: "OGN-280", count: 1 },
  { cardCode: "OGN-288", count: 1 },
  { cardCode: "OGN-292", count: 1 },
];

const sideboard: Deck = [
  { cardCode: "OGN-022", count: 2 },
  { cardCode: "OGN-024", count: 2 },
  { cardCode: "OGN-093", count: 2 },
  { cardCode: "OGN-088", count: 1 },
  { cardCode: "OGN-114", count: 1 },
];

// Encode with sideboard and chosen champion
const deckCode = getCodeFromDeck(mainDeck, sideboard, "OGN-103");
console.log(deckCode);

// Encode without chosen champion
const deckCodeNoChampion = getCodeFromDeck(mainDeck, sideboard);
console.log(deckCodeNoChampion);

// Encode without sideboard (pass empty array for sideboard)
const deckCodeNoSideboard = getCodeFromDeck(mainDeck, [], "OGN-103");
console.log(deckCodeNoSideboard);
```

### Decoding a Deck

```typescript
import { getDeckFromCode } from "@piltoverarchive/riftbound-deck-codes";
import type { DeckWithSideboard } from "@piltoverarchive/riftbound-deck-codes";

const code =
  "CIAAAAAAAAAQCAAAA4AACAIAABMQAAILAAAAICIMDMOVOX3AM5UHIAIDAAACO6XYAEAQKAAABX3QDGACUABKIAQAAEBQAAAWDBOQCAQAABMHE";

const decoded: DeckWithSideboard = getDeckFromCode(code);

console.log("Main Deck:", decoded.mainDeck);
// 21 cards including 7x OGN-007 (runes), 5x OGN-089 (runes), and various 1-3 copy cards

console.log("Sideboard:", decoded.sideboard);
// 8 cards: 2x OGN-022, 2x OGN-024, 2x OGN-093, 1x OGN-088, 1x OGN-114

console.log("Chosen Champion:", decoded.chosenChampion);
// The chosen champion card code (e.g., "OGN-103") or undefined if not set
```

### Decoding Options

You can customize how signed cards are decoded by passing an options object:

```typescript
import { getDeckFromCode } from "@piltoverarchive/riftbound-deck-codes";
import type { DecodeOptions } from "@piltoverarchive/riftbound-deck-codes";

const code = "YOUR_DECK_CODE";

// Default: signed cards use 's' suffix (e.g., OGN-007s)
const defaultDecode = getDeckFromCode(code);

// Use '*' suffix for signed cards (e.g., OGN-007*)
const starDecode = getDeckFromCode(code, { signedSuffix: "*" });
```

### Important Notes

- **No Game Rule Validation**: This library only encodes/decodes deck data. It does not validate Riftbound game rules (card limits, sideboard size, etc.). Validation should be done in your application.
- **Card Counts**: Main deck supports counts 1-12 (for runes and standard cards). Sideboard only supports counts 1-3 (optimized for regular cards only).
- **Always Version 3**: All new deck codes encode as Version 3. The chosen champion section adds 1 byte (no champion) or 4-5 bytes (with champion).
- **Backward Compatibility**: Can decode Version 1/2 codes which return `chosenChampion: undefined`.

## Implementations

The TypeScript implementation in this repository is the reference implementation. Community implementations in other languages are welcome!

### Current Version

| Name               | Language   | Version\* | Maintainer      |
| ------------------ | ---------- | --------- | --------------- |
| RiftboundDeckCodes | TypeScript | 3         | PiltoverArchive |

\*Version refers to the MAX_KNOWN_VERSION supported by the implementation.

## Links

- **PiltoverArchive**: [https://piltoverarchive.com](https://piltoverarchive.com) - Comprehensive Riftbound TCG companion app
- **Riftbound TCG**: [https://riftbound.leagueoflegends.com/](https://riftbound.leagueoflegends.com/) Official game information and rules

## Credits

This library is adapted from [Riot Games' LoRDeckCodes](https://github.com/RiotGames/LoRDeckCodes) for use with Riftbound TCG.

This project is not affiliated with or endorsed by Riot Games.

## License

Apache 2.0 (see [LICENSE](LICENSE) for details)
