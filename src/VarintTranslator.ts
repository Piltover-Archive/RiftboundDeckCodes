// THIS CODE IS ADAPTED FROM https://github.com/RiotGames/LoRDeckCodes/blob/main/LoRDeckCodes/VarintTranslator.cs

/**
 * VarintTranslator handles encoding and decoding of variable-length integers
 * used in the Riftbound deck code format.
 *
 * Variable-length integers use the most significant bit (MSB) as a continuation flag.
 * If MSB is 1, more bytes follow. If MSB is 0, this is the final byte.
 */
export default class VarintTranslator {
	private static readonly AllButMSB = 0x7f;
	private static readonly JustMSB = 0x80;

	private bytes: Uint8Array;

	constructor(_bytes: ArrayBuffer | Uint8Array) {
		this.bytes = new Uint8Array(_bytes);
	}

	public get length(): number {
		return this.bytes.length;
	}

	/**
	 * Reads and removes a varint from the beginning of the byte array
	 * @returns The decoded integer value
	 * @throws Error if no bytes available or invalid varint format
	 */
	public PopVarint(): number {
		if (this.bytes.length === 0) {
			throw new Error("No bytes available to read varint");
		}

		let result = 0;
		let currentShift = 0;
		let bytesPopped = 0;

		for (let i = 0; i < this.bytes.length; i++) {
			bytesPopped++;

			const current = this.bytes[i]! & VarintTranslator.AllButMSB;
			result |= current << currentShift;

			if (
				(this.bytes[i]! & VarintTranslator.JustMSB) !==
				VarintTranslator.JustMSB
			) {
				this.bytes = this.bytes.slice(bytesPopped);
				return result;
			}

			currentShift += 7;
		}

		throw new Error("Byte array did not contain valid varints.");
	}

	/**
	 * Slices the internal byte array
	 * @param begin - Start index
	 * @param end - Optional end index
	 */
	public sliceAndSet(begin: number, end?: number): void {
		this.bytes = this.bytes.slice(begin, end);
	}

	/**
	 * Gets a byte at the specified index
	 * @param index - Index to retrieve
	 * @returns The byte value at the index
	 * @throws Error if index is out of bounds
	 */
	public get(index: number): number {
		if (index < 0 || index >= this.bytes.length) {
			throw new Error(`Index out of bounds: ${index}`);
		}
		return this.bytes[index]!;
	}

	/**
	 * Converts a number into its varint byte representation
	 * @param value - The number to encode
	 * @returns Uint8Array containing the varint encoding
	 */
	public static GetVarint(value: number): Uint8Array {
		const buff = new Uint8Array(10);
		let currentIndex = 0;

		if (value === 0) return new Uint8Array([0]);

		while (value !== 0) {
			// Get lower 7 bits
			let byteVal = value & this.AllButMSB;

			// Shift right by 7 bits
			value >>>= 7;

			// If more bytes needed, set continuation bit
			if (value !== 0) byteVal |= this.JustMSB;

			buff[currentIndex++] = byteVal;
		}

		return buff.slice(0, currentIndex);
	}
}
