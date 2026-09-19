export interface Card {
	cardCode: string;
	count: number;
}

export type Deck = Card[];

export interface DeckWithSideboard {
	mainDeck: Deck;
	sideboard: Deck;
	chosenChampion?: string;
	/**
	 * Legends a deck brings *in addition* to its starting legend, outside the
	 * main deck. Carried by format version 6+; `undefined` for v1-v5 codes,
	 * which have no legends block at all. Order is preserved as given.
	 */
	additionalLegends?: string[];
}

export interface SetVariantGroup {
	set: number;
	variant: number;
	cardNumbers: string[];
}

export interface CountGroup {
	setVariantGroups: SetVariantGroup[];
}

export interface DecodeOptions {
	signedSuffix?: "s" | "*";
}
