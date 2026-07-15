// Behavior tests for the public deck-code interface (getCodeFromDeck / getDeckFromCode).
// Run against the COMPILED dist — the exact artifact that ships to npm.
const test = require("node:test");
const assert = require("node:assert/strict");

const { getCodeFromDeck, getDeckFromCode } = require("../dist/index.js");
const golden = require("./fixtures/golden.json");

// --- helpers (operate only on the public wire format / public API) ---
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Read the format/version nibble straight out of the code's first byte.
function versionOf(code) {
  const firstByte = (B32.indexOf(code[0]) << 3) | (B32.indexOf(code[1]) >> 2);
  return firstByte & 0x0f;
}
function formatOf(code) {
  const firstByte = (B32.indexOf(code[0]) << 3) | (B32.indexOf(code[1]) >> 2);
  return (firstByte >> 4) & 0x0f;
}

// Base32-encode arbitrary bytes (matches the library alphabet) — used to craft
// codes the library never emits (e.g. a future version byte).
function bytesToBase32(bytes) {
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += B32[(buffer >> bitsLeft) & 0x1f];
    }
  }
  if (bitsLeft > 0) {
    buffer <<= 5 - bitsLeft;
    result += B32[buffer & 0x1f];
  }
  return result;
}

// Decode base32 back to bytes (to inspect the deck-level prefix bit at byte 1).
function base32ToBytes(str) {
  const bytes = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const ch of str) {
    buffer = (buffer << 5) | B32.indexOf(ch.toUpperCase());
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }
  return bytes;
}
// The v5 prefix bit lives in the second byte (0 = all-normal, 1 = has R/SP).
const prefixBitOf = (code) => base32ToBytes(code)[1];

// Order-insensitive deck comparison shape (encode/decode order is deterministic
// but not required to match input order).
const normDeck = (deck) =>
  [...(deck || [])].sort(
    (a, b) => a.cardCode.localeCompare(b.cardCode) || a.count - b.count
  );
const shape = (r) => ({
  mainDeck: normDeck(r.mainDeck),
  sideboard: normDeck(r.sideboard),
  champion: r.chosenChampion ?? null,
});

const oneCard = (cardCode, count) => [{ cardCode, count }];

// ---------------------------------------------------------------------------
// (a) BACKWARD COMPATIBILITY — locked golden vectors from the 1.3.0 build.
//     These decks (max <=12 main / <=3 side) MUST keep emitting v3/v4 with the
//     old scheme, byte-identical, and their codes must decode identically.
// ---------------------------------------------------------------------------
test.describe("backward compatibility (1.3.0 golden vectors)", () => {
  for (const g of golden) {
    test.describe(g.name, () => {
      test("encodes to the exact recorded 1.3.0 string", () => {
        const code = getCodeFromDeck(
          g.input.mainDeck,
          g.input.sideboard,
          g.input.chosenChampion
        );
        assert.equal(code, g.code);
      });
      test("stays version 3 or 4 (never v5)", () => {
        assert.equal(formatOf(g.code), 1);
        assert.ok(
          versionOf(g.code) === 3 || versionOf(g.code) === 4,
          `expected v3/v4, got v${versionOf(g.code)}`
        );
      });
      test("decodes to the exact recorded deck", () => {
        assert.deepEqual(shape(getDeckFromCode(g.code)), shape(g.decoded));
      });
    });
  }
});

// ---------------------------------------------------------------------------
// (b) BOUNDARY — v5 only triggers when a section actually needs >12 / >3.
// ---------------------------------------------------------------------------
test.describe("version-selection boundary", () => {
  test("12 copies of a main card stays v3", () => {
    assert.equal(versionOf(getCodeFromDeck(oneCard("OGN-004", 12))), 3);
  });
  test("13 copies of a main card triggers v5", () => {
    assert.equal(versionOf(getCodeFromDeck(oneCard("OGN-004", 13))), 5);
  });
  test("3 copies of a sideboard card stays v3", () => {
    assert.equal(
      versionOf(getCodeFromDeck(oneCard("OGN-004", 1), oneCard("OGN-050", 3))),
      3
    );
  });
  test("4 copies of a sideboard card triggers v5", () => {
    assert.equal(
      versionOf(getCodeFromDeck(oneCard("OGN-004", 1), oneCard("OGN-050", 4))),
      5
    );
  });
  test("12 copies + a rune stays v4 (not v5)", () => {
    const code = getCodeFromDeck([
      { cardCode: "OGN-004", count: 12 },
      { cardCode: "SFD-R02", count: 3 },
    ]);
    assert.equal(versionOf(code), 4);
  });
  test("13 copies + a rune becomes v5", () => {
    const code = getCodeFromDeck([
      { cardCode: "OGN-004", count: 13 },
      { cardCode: "SFD-R02", count: 3 },
    ]);
    assert.equal(versionOf(code), 5);
  });
});

// ---------------------------------------------------------------------------
// (c) v5 WIRE FORMAT — locked against an INDEPENDENT sparse-bucketed oracle
//     (a separate reimplementation, not this library). Agreement here means two
//     implementations produce the identical bytes — protects downstream ports.
// ---------------------------------------------------------------------------
test.describe("v5 wire format (independent oracle vectors)", () => {
  const vectors = [
    { name: "13x VEN-097", main: oneCard("VEN-097", 13), side: [], code: "CUAACDIBAECQAYIAAA" },
    { name: "40x VEN-097", main: oneCard("VEN-097", 40), side: [], code: "CUAACKABAECQAYIAAA" },
    {
      name: "20x VEN-097 + sideboard 4x VEN-050",
      main: oneCard("VEN-097", 20),
      side: oneCard("VEN-050", 4),
      code: "CUAACFABAECQAYIBAQAQCBIAGIAA",
    },
    // count crosses the 128 varint boundary (first 2-byte count) — locks the
    // one field v5 newly writes as an explicit varint against the oracle.
    { name: "128x VEN-097 (2-byte count)", main: oneCard("VEN-097", 128), side: [], code: "CUAADAABAEAQKADBAAAA" },
    { name: "200x VEN-097 (2-byte count)", main: oneCard("VEN-097", 200), side: [], code: "CUAADSABAEAQKADBAAAA" },
  ];
  for (const v of vectors) {
    test(`${v.name} encodes to the oracle string`, () => {
      assert.equal(getCodeFromDeck(v.main, v.side), v.code);
    });
    test(`${v.name} is version 5`, () => {
      assert.equal(versionOf(v.code), 5);
    });
  }
});

// ---------------------------------------------------------------------------
// (c/d/e/g) ROUND-TRIP — encode -> decode -> deep-equal for v5 decks.
// ---------------------------------------------------------------------------
test.describe("v5 round-trips", () => {
  const cases = [
    {
      name: "13 copies of one main card",
      main: oneCard("OGN-004", 13),
      side: [],
      champion: undefined,
    },
    {
      name: "40 copies of one main card (max)",
      main: oneCard("OGN-004", 40),
      side: [],
      champion: undefined,
    },
    {
      name: "sideboard with 4 copies",
      main: oneCard("OGN-004", 2),
      side: oneCard("OGN-050", 4),
      champion: undefined,
    },
    {
      name: "sideboard with 8 copies (max)",
      main: oneCard("OGN-004", 2),
      side: oneCard("OGN-050", 8),
      champion: undefined,
    },
    {
      name: "high copy count + runes together (flags preserved)",
      main: [
        { cardCode: "VEN-097", count: 20 },
        { cardCode: "SFD-R02", count: 3 },
        { cardCode: "UNL-R05a", count: 2 },
        { cardCode: "OGN-007", count: 3 },
        { cardCode: "OGN-013", count: 1 },
      ],
      side: [{ cardCode: "OGN-050", count: 4 }],
      champion: undefined,
    },
    {
      name: "high copy count + chosen champion",
      main: [
        { cardCode: "VEN-097", count: 25 },
        { cardCode: "OGN-103", count: 3 },
        { cardCode: "OGN-013", count: 2 },
      ],
      side: [{ cardCode: "OGN-050", count: 5 }],
      champion: "OGN-103",
    },
    {
      name: "realistic 40-card Spiderling deck",
      main: [
        { cardCode: "VEN-097", count: 19 },
        { cardCode: "VEN-001", count: 3 },
        { cardCode: "VEN-002", count: 3 },
        { cardCode: "VEN-003", count: 3 },
        { cardCode: "VEN-010", count: 2 },
        { cardCode: "VEN-020", count: 1 },
        { cardCode: "VEN-021", count: 1 },
        { cardCode: "VEN-022", count: 1 },
      ],
      side: [
        { cardCode: "VEN-050", count: 4 },
        { cardCode: "VEN-051", count: 2 },
      ],
      champion: undefined,
    },
    {
      name: "real card: 20x VEN-097 (VEN = set 5)",
      main: oneCard("VEN-097", 20),
      side: [],
      champion: undefined,
    },
    {
      name: "copy count crossing the varint boundary (128)",
      main: oneCard("VEN-097", 128),
      side: [],
      champion: undefined,
    },
  ];
  for (const c of cases) {
    test(c.name, () => {
      const code = getCodeFromDeck(c.main, c.side, c.champion);
      assert.equal(versionOf(code), 5, "should be a v5 code");
      const decoded = getDeckFromCode(code);
      assert.deepEqual(shape(decoded), {
        mainDeck: normDeck(c.main),
        sideboard: normDeck(c.side),
        champion: c.champion ?? null,
      });
    });
  }

  test("signedSuffix option is honored in v5", () => {
    const main = [
      { cardCode: "VEN-097", count: 15 },
      { cardCode: "OGN-007*", count: 2 },
    ];
    const code = getCodeFromDeck(main);
    const decoded = getDeckFromCode(code, { signedSuffix: "*" });
    assert.ok(
      decoded.mainDeck.some((c) => c.cardCode === "OGN-007*"),
      "signed card should decode with the '*' suffix"
    );
  });
});

// ---------------------------------------------------------------------------
// v5 prefix-bit optimization — all-normal decks drop the per-card flag byte.
// ---------------------------------------------------------------------------
test.describe("v5 prefix-bit optimization", () => {
  test("all-normal high-copy deck sets the prefix bit to 0", () => {
    const code = getCodeFromDeck(oneCard("VEN-097", 40));
    assert.equal(versionOf(code), 5);
    assert.equal(prefixBitOf(code), 0);
  });
  test("a deck with an SP card sets the prefix bit to 1", () => {
    const code = getCodeFromDeck(oneCard("VEN-SP1", 13));
    assert.equal(prefixBitOf(code), 1);
  });
  test("a high-copy deck that also has a rune sets the prefix bit to 1", () => {
    const code = getCodeFromDeck([
      { cardCode: "VEN-097", count: 20 },
      { cardCode: "SFD-R02", count: 3 },
    ]);
    assert.equal(prefixBitOf(code), 1);
  });
  test("dropping the flags makes an all-normal high-copy code shorter", () => {
    const allNormal = getCodeFromDeck([
      { cardCode: "VEN-097", count: 20 },
      { cardCode: "VEN-001", count: 3 },
      { cardCode: "VEN-002", count: 3 },
      { cardCode: "VEN-003", count: 3 },
      { cardCode: "VEN-010", count: 2 },
    ]);
    // Identical set/variant grouping — only VEN-001 -> VEN-R01 (same VEN base
    // group, same count) — so the length delta isolates the flag-byte cost:
    // flipping the prefix bit to 1 adds one flag byte per card.
    const withRune = getCodeFromDeck([
      { cardCode: "VEN-097", count: 20 },
      { cardCode: "VEN-R01", count: 3 },
      { cardCode: "VEN-002", count: 3 },
      { cardCode: "VEN-003", count: 3 },
      { cardCode: "VEN-010", count: 2 },
    ]);
    assert.equal(prefixBitOf(allNormal), 0);
    assert.equal(prefixBitOf(withRune), 1);
    assert.ok(
      allNormal.length < withRune.length,
      `all-normal (${allNormal.length}) should be shorter than flagged (${withRune.length})`
    );
  });
});

// ---------------------------------------------------------------------------
// SP (special) number prefix — third value (0x02) on the flag byte, v5.
// ---------------------------------------------------------------------------
test.describe("SP (special) number prefix", () => {
  // Exact bytes locked against the independent sparse+SP oracle.
  const oracle = [
    { name: "VEN-SP1 x3", main: oneCard("VEN-SP1", 3), code: "CUAQCAYBAECQAAQBAAAA" },
    { name: "VEN-SP1a x3", main: oneCard("VEN-SP1a", 3), code: "CUAQCAYBAECQCAQBAAAA" },
    {
      name: "mixed 001/SP1/SP2 x3",
      main: [
        { cardCode: "VEN-001", count: 3 },
        { cardCode: "VEN-SP1", count: 3 },
        { cardCode: "VEN-SP2", count: 3 },
      ],
      code: "CUAQCAYBAMCQAAABAIAQEAQAAA",
    },
  ];
  for (const v of oracle) {
    test(`${v.name} matches the oracle string and is v5`, () => {
      const code = getCodeFromDeck(v.main);
      assert.equal(code, v.code);
      assert.equal(versionOf(code), 5);
    });
  }

  test("VEN-SP1 alone round-trips; emitted version is 5", () => {
    const code = getCodeFromDeck(oneCard("VEN-SP1", 3));
    assert.equal(versionOf(code), 5);
    assert.deepEqual(getDeckFromCode(code).mainDeck, [
      { cardCode: "VEN-SP1", count: 3 },
    ]);
  });

  test("VEN-SP1a preserves the variant", () => {
    const code = getCodeFromDeck(oneCard("VEN-SP1a", 2));
    assert.deepEqual(getDeckFromCode(code).mainDeck, [
      { cardCode: "VEN-SP1a", count: 2 },
    ]);
  });

  test("VEN-SP01 normalises to VEN-SP1 (unpadded, intended)", () => {
    const code = getCodeFromDeck(oneCard("VEN-SP01", 3));
    assert.deepEqual(getDeckFromCode(code).mainDeck, [
      { cardCode: "VEN-SP1", count: 3 },
    ]);
  });

  test("normal + SP cards in the same group are all recovered", () => {
    const main = [
      { cardCode: "VEN-001", count: 3 },
      { cardCode: "VEN-SP1", count: 3 },
      { cardCode: "VEN-SP2", count: 3 },
    ];
    const decoded = getDeckFromCode(getCodeFromDeck(main));
    assert.deepEqual(normDeck(decoded.mainDeck), normDeck(main));
  });

  test("SP card as chosen champion round-trips", () => {
    const code = getCodeFromDeck(oneCard("VEN-097", 3), [], "VEN-SP1");
    const decoded = getDeckFromCode(code);
    assert.equal(versionOf(code), 5);
    assert.equal(decoded.chosenChampion, "VEN-SP1");
  });

  test("SP card in the sideboard round-trips", () => {
    const code = getCodeFromDeck(oneCard("VEN-001", 3), oneCard("VEN-SP1", 2));
    const decoded = getDeckFromCode(code);
    assert.equal(versionOf(code), 5);
    assert.deepEqual(normDeck(decoded.sideboard), [
      { cardCode: "VEN-SP1", count: 2 },
    ]);
  });

  test("a rune AND an SP card together are both recovered, version 5", () => {
    const main = [
      { cardCode: "SFD-R02", count: 3 },
      { cardCode: "VEN-SP1", count: 3 },
      { cardCode: "VEN-001", count: 2 },
    ];
    const code = getCodeFromDeck(main);
    assert.equal(versionOf(code), 5);
    assert.deepEqual(normDeck(getDeckFromCode(code).mainDeck), normDeck(main));
  });

  test("lowercase 'sp' is rejected", () => {
    assert.throws(
      () => getCodeFromDeck(oneCard("VEN-sp1", 3)),
      /Invalid card code/
    );
  });
});

// ---------------------------------------------------------------------------
// (f) FORWARD-COMPAT GUARD — a code with a version byte beyond what we support
//     must throw loudly, never silently misread.
// ---------------------------------------------------------------------------
test.describe("forward-compatibility guard", () => {
  test("a version-6 code throws 'Unsupported version'", () => {
    const future = bytesToBase32([(1 << 4) | 6]); // format 1, version 6
    assert.throws(() => getDeckFromCode(future), /Unsupported version: 6/);
  });
  test("a version-15 code throws 'Unsupported version'", () => {
    const future = bytesToBase32([(1 << 4) | 15]);
    assert.throws(() => getDeckFromCode(future), /Unsupported version/);
  });
});

// ---------------------------------------------------------------------------
// Fail-loud decoding — unknown tokens throw rather than silently mis-decode.
// ---------------------------------------------------------------------------
test.describe("fail-loud decoding of unknown v5 tokens", () => {
  test("a deck-level prefix bit > 1 throws", () => {
    // format 1 / version 5, then prefix bit = 2 (only 0/1 are valid)
    const bad = bytesToBase32([(1 << 4) | 5, 0x02]);
    assert.throws(() => getDeckFromCode(bad), /Unsupported deck prefix flag/);
  });
  test("an unknown per-card prefix flag throws", () => {
    // v5, prefix bit = 1 (flagged), main: 1 count(=3), 1 group, 1 card,
    // set 5, variant 0, then an unknown flag 0x03 before the number.
    const bad = bytesToBase32([
      (1 << 4) | 5, 0x01, 1, 3, 1, 1, 5, 0, 0x03, 1,
    ]);
    assert.throws(() => getDeckFromCode(bad), /Unknown number-prefix flag/);
  });
  test("an unknown champion prefix flag throws (distinct from per-card)", () => {
    // v5, prefix bit = 1, empty main + sideboard sections, then a present
    // champion (set 5, variant 0) whose prefix flag is an unsupported 0x03.
    const bad = bytesToBase32([
      (1 << 4) | 5, 0x01, 0x00, 0x00, 0x01, 5, 0, 0x03, 1,
    ]);
    assert.throws(
      () => getDeckFromCode(bad),
      /Unknown number-prefix flag in champion/
    );
  });
});

// ---------------------------------------------------------------------------
// Encode input validation — malformed counts are rejected, not silently wrapped.
// ---------------------------------------------------------------------------
test.describe("encode rejects invalid card counts", () => {
  for (const bad of [0, -1, 2.5, NaN, Infinity]) {
    test(`count ${bad} throws`, () => {
      assert.throws(
        () => getCodeFromDeck(oneCard("OGN-004", bad)),
        /Count must be a positive integer/
      );
    });
    test(`sideboard count ${bad} throws`, () => {
      assert.throws(
        () => getCodeFromDeck(oneCard("OGN-004", 1), oneCard("OGN-050", bad)),
        /Count must be a positive integer/
      );
    });
  }
});
