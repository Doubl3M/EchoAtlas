import { hashString } from "./Hash";

export type SeedInput = number | string;

/**
 * Immutable normalization of numeric or textual seeds to a stable uint32 value.
 * Safe integer inputs normalize modulo 2^32; numeric zero and negative zero normalize to zero.
 */
export class Seed {
    public readonly value: number;

    public constructor(input: SeedInput) {
        if (typeof input === "string") {
            this.value = hashString(input);
            return;
        }

        if (!Number.isSafeInteger(input)) {
            throw new RangeError("Numeric seeds must be safe integers.");
        }

        this.value = input >>> 0;
    }
}
