import { describe, expect, it } from "vitest";

import { clamp, inverseLerp, lerp, smootherstep, smoothstep } from "../../../src/engine/math";

describe("interpolation", () => {
    it("clamps values with regular, reversed, and degenerate bounds", () => {
        expect(clamp(-1, 0, 10)).toBe(0);
        expect(clamp(4, 10, 0)).toBe(4);
        expect(clamp(12, 10, 0)).toBe(10);
        expect(clamp(3, 7, 7)).toBe(7);
    });

    it("linearly interpolates without implicitly clamping", () => {
        expect(lerp(10, 20, 0.25)).toBe(12.5);
        expect(lerp(10, 20, 1.5)).toBe(25);
        expect(lerp(20, 10, 0.25)).toBe(17.5);
    });

    it("inverts regular, reversed, and degenerate intervals", () => {
        expect(inverseLerp(10, 20, 12.5)).toBe(0.25);
        expect(inverseLerp(20, 10, 12.5)).toBe(0.75);
        expect(inverseLerp(5, 5, 100)).toBe(0);
    });

    it("smooths regular, reversed, and degenerate intervals", () => {
        expect(smoothstep(0, 1, 0.5)).toBe(0.5);
        expect(smootherstep(0, 1, 0.5)).toBe(0.5);
        expect(smoothstep(1, 0, 0.75)).toBe(0.15625);
        expect(smootherstep(2, 2, 1)).toBe(0);
        expect(smootherstep(2, 2, 2)).toBe(1);
    });

    it("rejects non-finite values", () => {
        expect(() => clamp(Number.NaN, 0, 1)).toThrow(RangeError);
        expect(() => lerp(0, Number.POSITIVE_INFINITY, 1)).toThrow(RangeError);
        expect(() => inverseLerp(0, 1, Number.NaN)).toThrow(RangeError);
        expect(() => smoothstep(0, Number.NaN, 1)).toThrow(RangeError);
        expect(() => smootherstep(0, 1, Number.NEGATIVE_INFINITY)).toThrow(RangeError);
    });
});
