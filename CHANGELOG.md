# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
