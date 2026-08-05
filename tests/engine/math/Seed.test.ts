import { describe, expect, it } from "vitest";

import { Seed } from "../../../src/engine/math";

describe("Seed", () => {
    it("normalizes numeric seeds to uint32 reference values", () => {
        expect(new Seed(0).value).toBe(0);
        expect(new Seed(-0).value).toBe(0);
        expect(new Seed(-1).value).toBe(0xffffffff);
        expect(new Seed(0x100000001).value).toBe(1);
        expect(new Seed(Number.MAX_SAFE_INTEGER).value).toBe(0xffffffff);
        expect(new Seed(Number.MIN_SAFE_INTEGER).value).toBe(1);
    });

    it("normalizes textual seeds to stable reference values", () => {
        expect(new Seed("").value).toBe(2872998923);
        expect(new Seed("EchoAtlas").value).toBe(3024527161);
        expect(new Seed("音楽🌍").value).toBe(2761701977);
    });

    it("does not normalize canonically equivalent Unicode representations", () => {
        const composed = new Seed("é");
        const decomposed = new Seed("e\u0301");

        expect(composed.value).not.toBe(decomposed.value);
    });

    it("rejects non-integer and unsafe numeric seeds", () => {
        expect(() => new Seed(1.5)).toThrow(RangeError);
        expect(() => new Seed(Number.POSITIVE_INFINITY)).toThrow(RangeError);
        expect(() => new Seed(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
        expect(() => new Seed(Number.MIN_SAFE_INTEGER - 1)).toThrow(RangeError);
    });
});
