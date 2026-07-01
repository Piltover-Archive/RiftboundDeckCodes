const assert = require("node:assert/strict");
const { getCodeFromDeck, getDeckFromCode, SET_MAP } = require("../dist");

function sortDeck(deck) {
	return [...deck].sort((a, b) => {
		const codeCompare = a.cardCode.localeCompare(b.cardCode);
		if (codeCompare !== 0) return codeCompare;
		return a.count - b.count;
	});
}

assert.strictEqual(SET_MAP.VEN, 5, "VEN set id should be stable");
assert.strictEqual(SET_MAP.RAD, 6, "RAD set id should be stable");

const mainDeck = [
	{ cardCode: "VEN-001", count: 3 },
	{ cardCode: "VEN-R01", count: 12 },
];
const sideboard = [{ cardCode: "RAD-010a", count: 2 }];
const chosenChampion = "RAD-007";

const code = getCodeFromDeck(mainDeck, sideboard, chosenChampion);
const decoded = getDeckFromCode(code);

assert.deepStrictEqual(sortDeck(decoded.mainDeck), sortDeck(mainDeck));
assert.deepStrictEqual(sortDeck(decoded.sideboard), sortDeck(sideboard));
assert.strictEqual(decoded.chosenChampion, chosenChampion);

console.log("riftbound set model tests passed");
