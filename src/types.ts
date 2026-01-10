export interface Card {
	cardCode: string;
	count: number;
}

export type Deck = Card[];

export interface DeckWithSideboard {
	mainDeck: Deck;
	sideboard: Deck;
	chosenChampion?: string;
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
