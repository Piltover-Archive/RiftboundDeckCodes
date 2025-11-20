export interface Card {
	cardCode: string;
	count: number;
}

export type Deck = Card[];

export interface DeckWithSideboard {
	mainDeck: Deck;
	sideboard: Deck;
}

export interface SetVariantGroup {
	set: number;
	variant: number;
	cardNumbers: string[];
}

export interface CountGroup {
	setVariantGroups: SetVariantGroup[];
}
