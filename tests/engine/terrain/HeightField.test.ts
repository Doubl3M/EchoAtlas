import { describe, expect, it } from "vitest";

import { HeightField } from "../../../src/engine/terrain";

describe("HeightField", () => {
    it("reads contiguous values in documented row-major order", () => {
        const field = new HeightField(3, 2, [0, 0.1, 0.2, 0.3, 0.4, 1]);

        expect(field.width).toBe(3);
        expect(field.height).toBe(2);
        expect(field.get(0, 0)).toBe(0);
        expect(field.get(2, 0)).toBe(0.2);
        expect(field.get(0, 1)).toBe(0.3);
        expect(field.get(2, 1)).toBe(1);
    });

    it("copies constructor data and exported arrays", () => {
        const input = new Float64Array([0.25, 0.75]);
        const field = new HeightField(2, 1, input);
        input[0] = 1;
        const firstExport = field.toArray();
        const secondExport = field.toArray();
        firstExport[1] = 0;

        expect(field.get(0, 0)).toBe(0.25);
        expect(field.get(1, 0)).toBe(0.75);
        expect(field.toArray()).toEqual([0.25, 0.75]);
        expect(firstExport).not.toBe(secondExport);
        expect(Object.isFrozen(field)).toBe(true);
    });

    it("copies plain array sources", () => {
        const input = [0.1, 0.9];
        const field = new HeightField(2, 1, input);
        input[0] = 0.5;

        expect(field.toArray()).toEqual([0.1, 0.9]);
    });

    it.each([
        [-1, 0],
        [0, -1],
        [2, 0],
        [0, 2],
        [0.5, 0],
        [0, Number.NaN],
    ])("rejects out-of-bounds or invalid coordinates (%s, %s)", (x, y) => {
        const field = new HeightField(2, 2, [0, 0, 0, 0]);
        expect(() => field.get(x, y)).toThrow(RangeError);
    });

    it("rejects invalid dimensions and storage lengths", () => {
        expect(() => new HeightField(0, 1, [])).toThrow(RangeError);
        expect(() => new HeightField(1, -1, [])).toThrow(RangeError);
        expect(() => new HeightField(1.5, 1, [])).toThrow(RangeError);
        expect(() => new HeightField(2, 2, [0, 0, 0])).toThrow(RangeError);
        expect(() => new HeightField(Number.MAX_SAFE_INTEGER, 2, [])).toThrow(RangeError);
        expect(() => new HeightField(0x100000000, 1, [])).toThrow(RangeError);
    });

    it("rejects values outside the normalized finite interval", () => {
        expect(() => new HeightField(1, 1, [-0.01])).toThrow(RangeError);
        expect(() => new HeightField(1, 1, [1.01])).toThrow(RangeError);
        expect(() => new HeightField(1, 1, [Number.NaN])).toThrow(RangeError);
        expect(() => new HeightField(1, 1, [Number.POSITIVE_INFINITY])).toThrow(RangeError);
    });
});
