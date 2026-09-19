# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-09-19

### Added

- **Additional Legends (Version 6)**: `getCodeFromDeck` accepts a fourth argument, `additionalLegends` — the legends a deck brings *alongside* its starting legend, outside the main deck (e.g. the three a **Neeko** deck chooses). They round-trip through `getDeckFromCode` as `additionalLegends`.
- **Legends block**: Version 6 appends a count plus one card reference per legend after the chosen-champion trailer, mirroring how Version 3 appended the champion. Order is preserved — the block is a list, not a set. Each legend uses the same card reference layout as the champion and obeys the same deck-level prefix bit, so a rune or `SP` legend flips that bit for the whole deck.
- **The starting legend is recoverable again**: it still rides in `mainDeck`, and because additional legends now live in their own block and never appear in that array, the two are distinguishable without inspecting card types. Previously a fourth legend-typed card made *which one is the starting legend* ambiguous, and which one survived depended on the encoder's set/variant/number sort.
- **Golden vectors for Version 6**: committed with and without a chosen champion, plus rune and high-copy cases, each cross-checked against an independent reimplementation of the v6 layout.
- **Loud rejection of unknown variants**: an unrecognised variant byte now throws on decode instead of silently dropping the suffix and returning a base card. This closes the same class of gap the Version 5 number-prefix flags already covered, and it applies to every decode path — main deck, sideboard, chosen champion and additional legends.

### Changed

- Decks carrying additional legends now encode as Version 6. Version 6 reuses the Version 5 body wholesale (deck-level prefix bit and sparse count encoding), so a v6 deck gets high copy counts for free.
- Decoding a Version 1–5 code reports `additionalLegends` as `undefined` rather than an empty array, so callers can tell "this deck has none" from "this code cannot carry them".
- The chosen-champion trailer and the legends block now share one encode/decode path internally, so the two cannot drift apart. The bytes it writes are unchanged.
- Variant resolution is now a single shared function rather than three copies, so all decode paths reject unknown variants identically.

### Compatibility

- ✅ Can decode Version 1, 2, 3, 4, and 5 codes — unchanged.
- ✅ A deck **without** additional legends still encodes to a byte-identical string, on its existing version (verified: every committed golden vector, including when an empty legends array is passed explicitly).
- ✅ `getCodeFromDeck`'s new parameter is optional — existing call sites compile and behave identically.
- ❌ Version 6 codes require an updated library; older libraries reject them with an `Unsupported version` error rather than misreading them. **The backend must be able to decode v6 before any surface is allowed to emit it.**
- ⚠️ A code carrying an unrecognised variant byte now throws `Unknown variant code` where it previously decoded to a base-variant card. No code this library has ever emitted is affected — v1–6 only write variants `0`–`3` — so every real deck code and every golden vector decodes identically. Only malformed input, or a code written by a future library that adds a variant id, changes behaviour: from silently wrong to a thrown error. Note that set and variant ids are added *without* a format-version bump (1.3.0 added `VEN` and `RAD` that way), so the version guard alone could not catch this.

---

## [1.4.0] - 2026-07-15

### Added

- **High Copy-Count Support (Version 5)**: A single card may now exceed the previous count ceilings (12 in the main deck, 3 in the sideboard). This supports cards such as **Spiderling** (`VEN-097`), whose rules text allows any number of copies. A deck is encoded as Version 5 only when a card actually exceeds those ceilings.
- **Sparse count encoding**: Version 5 sections list only the copy-counts that actually occur (most copies first) instead of walking a fixed range, keeping high-copy codes compact.
- **Deck-level prefix bit**: A Version 5 code carries one bit indicating whether the deck uses any `R`/`SP` card. All-normal decks (the common high-copy case, e.g. Spiderling) omit the per-card flag byte entirely, making those codes ~25% shorter (e.g. a 40-card Spiderling deck drops from 133 to 100 characters).
- **`SP` Special-Card Prefix (Version 5)**: Card numbers may carry an `SP` (special) prefix, e.g. `VEN-SP1` / `VEN-SP1a`. `SP` is a third value (`0x02`) on the number-prefix flag byte, parallel to `R` (runes), independent of the variant suffix. Special numbers are variable-width (`SP1`, not `SP01`). Any deck containing an `SP` card encodes as Version 5.
- **Loud rejection of unknown prefixes**: The Version 5 decoder now throws on an unrecognised number-prefix flag instead of silently treating it as a normal card, so future additions fail safe on older decoders.
- **Test suite**: Added a `node:test` suite (`npm test`) with committed golden vectors locking backward compatibility and the v5 wire format (both high-copy and `SP` cases, cross-checked against an independent encoder).

### Changed

- Decks with a card above the count ceilings (`> 12` main / `> 3` sideboard) or containing an `SP` special card now encode as Version 5. All other decks continue to encode as Version 3 or 4, byte-for-byte identical to previous releases.

### Compatibility

- ✅ Can decode Version 1, 2, 3, and 4 codes — unchanged.
- ✅ Decks that fit the v1–4 ceilings still encode to byte-identical strings (verified by golden vectors).
- ❌ Version 5 codes require an updated library; older libraries reject them with an `Unsupported version` error rather than misreading them.

---

## [1.3.0] - 2026-07-01

### Added

- **VEN Set**: Added `VEN` (id `5`) to the set map for Vendetta.
- **RAD Set**: Added `RAD` (id `6`) to the set map for Radiance.

### Compatibility

- No deck-code format version change.
- Existing deck codes remain stable because the new set IDs are appended after `UNL: 4`.

---

## [1.2.0] - 2026-03-04

### Added

- **Rune Card Support (Version 4)**: Card codes with `R` prefix (e.g., `SFD-R02`, `UNL-R05a`) are now parsed, encoded, and decoded correctly. Rune numbers are 2-digit (`R01`–`R06`).
- **UNL Set**: Added `UNL` (id `4`) to the set map.

### Changed

- Decks containing `R`-prefixed rune card numbers now encode as Version 4
- `parseCardCode()` regex updated to accept `R`-prefixed card numbers
- Binary format uses a flag byte (`0x00` normal, `0x01` rune) before each card number varint

### Compatibility

- ✅ Can decode Version 1, 2, and 3 codes (no rune cards in those versions)
- ❌ Version 4 codes require updated library (older libraries will reject v4 codes)

---

## [1.1.0] - 2026-01-10

### Added

- **Chosen Champion Support (Version 3)**: New optional `chosenChampion` parameter for `getCodeFromDeck()` and returned in `getDeckFromCode()`. The champion is a label referencing a card in the main deck.
- **Alternative Signed Card Suffix**: Support `*` as an alternative to `s` for signed cards (e.g., `OGN-007*` is equivalent to `OGN-007s`)
- **Decode Options**: New `signedSuffix` option in `getDeckFromCode()` to control whether signed cards decode with `s` or `*` suffix

### Changed

- Deck codes now encode as Version 3 by default
- `DeckWithSideboard` type now includes optional `chosenChampion?: string` field

### Compatibility

- ✅ Can decode Version 1 and 2 codes (returns `chosenChampion: undefined`)
- ❌ Version 3 codes require updated library (older libraries will reject v3 codes)

---

## [1.0.0] - 2025

### Added

- Initial release of RiftboundDeckCodes library
- Support for encoding Riftbound TCG decks to shareable codes
- Support for decoding deck codes back to deck lists
- Version 1 format: Main deck only
- Version 2 format: Main deck + sideboard support
- Support for 4 sets: OGN, OGS, SFD, ARC
- Support for 4 variants: base, a, s, b
- Support for card counts 1-12 (for runes and standard cards)
- Comprehensive error handling for invalid inputs
- TypeScript type definitions
- Base32 encoding for compact, shareable codes
- Variable-length integer encoding for space efficiency
- Full documentation and usage examples
- Compatibility with LoR deck code format structure

### Format Specification

- Format byte: `1`
- Version 1: Main deck encoding only
- Version 2: Main deck + sideboard (exactly 0 or 8 cards)
- Card code format: `SET-NUMBERvariant` (e.g., `OGN-007a`)
- Set encoding: 1 byte per set (0-255 supported)
- Variant encoding: 1 byte per variant (0-255 supported)
- Count groups: 12 down to 1 for backward compatibility

---

## Version History Summary

| Version | Date       | Key Changes                                              |
| ------- | ---------- | -------------------------------------------------------- |
| 1.4.0   | 2026-07-15 | High copy-count support (Version 5, sparse encoding)     |
| 1.3.0   | 2026-07-01 | VEN and RAD set identifiers                              |
| 1.2.0   | 2026-03-04 | Rune card support (R## format), UNL set                  |
| 1.1.0   | 2026-01-10 | Chosen champion support, alternative signed card suffix  |
| 1.0.0   | 2025       | Initial release with Version 1 and Version 2 support     |

---

## Migration Guides

### From Version 1 to Version 2

If you're upgrading from using Version 1 codes (main deck only) to Version 2 (with sideboard):

**Before (Version 1):**

```typescript
const deckCode = getCodeFromDeck(mainDeck);
const decoded = getDeckFromCode(deckCode); // Returns Deck
```

**After (Version 2):**

```typescript
const deckCode = getCodeFromDeck(mainDeck, sideboard);
const decoded = getDeckFromCode(deckCode); // Returns DeckWithSideboard
```

**Backward Compatibility:**

- Version 1 codes still work and return empty sideboard array
- Version 2 encoder automatically detects if sideboard is provided
- No breaking changes to existing code

---

For a full list of changes, see the [commit history](https://github.com/Piltover-Archive/RiftboundDeckCodes/commits/main).
