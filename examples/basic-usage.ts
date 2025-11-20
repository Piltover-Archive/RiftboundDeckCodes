import { getCodeFromDeck, getDeckFromCode } from '../src/index';
import type { Deck, DeckWithSideboard } from '../src/index';

// Example 1: Encode Kai'Sa deck (Version 1 - no sideboard)
function exampleBasicEncoding() {
	console.log('=== Example 1: Kai\'Sa Deck Encoding (V1 - No Sideboard) ===\n');

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

	const deckCode = getCodeFromDeck(mainDeck);
	console.log('Encoded deck code (V1):', deckCode);
	console.log('Length:', deckCode.length, 'characters');
	console.log('');
}

// Example 2: Encode Kai'Sa deck with sideboard (Version 2)
function exampleSideboardEncoding() {
	console.log('=== Example 2: Kai\'Sa Deck with Sideboard (V2) ===\n');

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

	// Sideboard (optimized encoding: only processes counts 1-3)
	const sideboard: Deck = [
		{ cardCode: "OGN-022", count: 2 },
		{ cardCode: "OGN-024", count: 2 },
		{ cardCode: "OGN-093", count: 2 },
		{ cardCode: "OGN-088", count: 1 },
		{ cardCode: "OGN-114", count: 1 },
	];

	const deckCode = getCodeFromDeck(mainDeck, sideboard);
	console.log('Encoded deck code (V2 with sideboard):', deckCode);
	console.log('Length:', deckCode.length, 'characters');
	console.log('Sideboard optimization saves ~12% space!');
	console.log('');
}

// Example 3: Decode Kai'Sa deck code
function exampleDecoding() {
	console.log('=== Example 3: Decoding Kai\'Sa Deck Code ===\n');

	const deckCode = "CIAAAAAAAAAQCAAAA4AACAIAABMQAAILAAAAICIMDMOVOX3AM5UHIAIDAAACO6XYAEAQKAAABX3QDGACUABKIAQAAEBQAAAWDBOQCAQAABMHE";

	const decoded: DeckWithSideboard = getDeckFromCode(deckCode);

	console.log('Main Deck (21 cards):');
	decoded.mainDeck.forEach(card => {
		console.log(`  ${card.count}x ${card.cardCode}`);
	});

	if (decoded.sideboard.length > 0) {
		console.log('\nSideboard (8 cards):');
		decoded.sideboard.forEach(card => {
			console.log(`  ${card.count}x ${card.cardCode}`);
		});
	} else {
		console.log('\nNo sideboard in this deck.');
	}

	console.log('');
}

// Example 4: Error handling
function exampleErrorHandling() {
	console.log('=== Example 4: Error Handling ===\n');

	// Invalid card code format
	try {
		const invalidDeck: Deck = [
			{ cardCode: "INVALID-FORMAT", count: 1 },
		];
		getCodeFromDeck(invalidDeck);
	} catch (error) {
		console.log('❌ Invalid card code error:', (error as Error).message);
	}

	// Note: Sideboard size is NOT validated by the library
	// The library will encode any sideboard size (game rules are your responsibility)
	const mainDeck: Deck = [{ cardCode: "OGN-001", count: 1 }];
	const anySideboard: Deck = [
		{ cardCode: "OGN-002", count: 1 },
		{ cardCode: "OGN-003", count: 1 },
	]; // Any size works - validation is your responsibility

	const codeWithAnySideboard = getCodeFromDeck(mainDeck, anySideboard);
	console.log('✅ Sideboard of any size encodes successfully:', codeWithAnySideboard);

	// Unknown set code
	try {
		const unknownSetDeck: Deck = [
			{ cardCode: "ZZZ-001", count: 1 },
		];
		getCodeFromDeck(unknownSetDeck);
	} catch (error) {
		console.log('❌ Unknown set error:', (error as Error).message);
	}

	console.log('');
}

// Example 5: Working with different sets and variants
function exampleSetsAndVariants() {
	console.log('=== Example 5: Different Sets and Variants ===\n');

	const mixedDeck: Deck = [
		// Origins set
		{ cardCode: "OGN-001", count: 3 },      // Base variant
		{ cardCode: "OGN-050a", count: 2 },     // Variant 'a'

		// Origins: Shadows set
		{ cardCode: "OGS-022s", count: 2 },     // Special variant

		// Shadowfire Depths set
		{ cardCode: "SFD-015", count: 1 },      // Base variant
		{ cardCode: "SFD-100b", count: 1 },     // Variant 'b'

		// Arcane Rifts set
		{ cardCode: "ARC-042", count: 2 },      // Base variant
	];

	const deckCode = getCodeFromDeck(mixedDeck);
	console.log('Encoded mixed set/variant deck:', deckCode);

	const decoded = getDeckFromCode(deckCode);
	console.log('\nDecoded cards:');
	decoded.mainDeck.forEach(card => {
		console.log(`  ${card.count}x ${card.cardCode}`);
	});

	console.log('');
}

// Example 6: Understanding rune encoding
function exampleRuneDeck() {
	console.log('=== Example 6: Understanding Rune Encoding ===\n');

	const deckWithRunes: Deck = [
		// Regular cards
		{ cardCode: "OGN-095", count: 3 },
		{ cardCode: "OGN-004", count: 3 },

		// Runes (Riftbound game rules: must total 12)
		{ cardCode: "OGN-007", count: 7 },   // Rune card 1
		{ cardCode: "OGN-089", count: 5 },   // Rune card 2
		// 7 + 5 = 12 total runes
	];

	const deckCode = getCodeFromDeck(deckWithRunes);
	console.log('Encoded rune deck:', deckCode);
	console.log('Note: Main deck supports counts 1-12 for runes and regular cards');
	console.log('');
}

// Run all examples
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     Riftbound Deck Codes - Usage Examples             ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');

exampleBasicEncoding();
exampleSideboardEncoding();
exampleDecoding();
exampleErrorHandling();
exampleSetsAndVariants();
exampleRuneDeck();

console.log('✅ All examples completed!');
