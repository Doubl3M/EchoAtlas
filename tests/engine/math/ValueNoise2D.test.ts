import { describe, expect, it } from "vitest";

import { Seed, ValueNoise2D } from "../../../src/engine/math";

describe("ValueNoise2D", () => {
    it("keeps exact sample references", () => {
        const noise = new ValueNoise2D("EchoAtlas");

        expect(noise.sample(0, 0)).toBe(0.18553985399194062);
        expect(noise.sample(0.25, 0.75)).toBe(0.5853299638471725);
        expect(noise.sample(-3.5, 2.125)).toBe(0.6224508202806334);
        expect(noise.sample(-12.75, -9.5)).toBe(0.4520379272187256);
    });

    it("keeps exact values at integer lattice vertices", () => {
        const noise = new ValueNoise2D("EchoAtlas");

        expect(noise.sample(0, 0)).toBe(0.18553985399194062);
        expect(noise.sample(-4, 3)).toBe(0.4516460089944303);
        expect(noise.sample(7, -9)).toBe(0.32248441595584154);
    });

    it("is deterministic for the same seed and differs across seeds", () => {
        const first = new ValueNoise2D(123);
        const second = new ValueNoise2D(new Seed(123));
        const different = new ValueNoise2D(124);
        const coordinates = [
            [0.1, 0.2],
            [-1.25, 8.75],
            [100.5, -200.5],
        ] as const;

        expect(coordinates.map(([x, y]) => first.sample(x, y))).toEqual(
            coordinates.map(([x, y]) => second.sample(x, y))
        );
        expect(coordinates.map(([x, y]) => first.sample(x, y))).not.toEqual(
            coordinates.map(([x, y]) => different.sample(x, y))
        );
    });

    it("remains locally continuous across lattice boundaries", () => {
        const noise = new ValueNoise2D("continuity");
        const epsilon = 0.000001;
        const left = noise.sample(1 - epsilon, -2.25);
        const right = noise.sample(1 + epsilon, -2.25);
        const above = noise.sample(4.75, -3 - epsilon);
        const below = noise.sample(4.75, -3 + epsilon);
        const negativeLeft = noise.sample(-2 - epsilon, -1.5);
        const negativeRight = noise.sample(-2 + epsilon, -1.5);

        expect(Math.abs(left - right)).toBeLessThan(0.00001);
        expect(Math.abs(above - below)).toBeLessThan(0.00001);
        expect(Math.abs(negativeLeft - negativeRight)).toBeLessThan(0.00001);
    });

    it("always returns normalized values", () => {
        const noise = new ValueNoise2D(999);

        for (let x = -10; x <= 10; x += 0.25) {
            for (let y = -10; y <= 10; y += 0.25) {
                const value = noise.sample(x, y);
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(1);
            }
        }
    });

    it("rejects invalid coordinates", () => {
        const noise = new ValueNoise2D(1);

        expect(() => noise.sample(Number.NaN, 0)).toThrow(RangeError);
        expect(() => noise.sample(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
        expect(() => noise.sample(Number.MAX_SAFE_INTEGER, 0)).toThrow(RangeError);
    });
});
