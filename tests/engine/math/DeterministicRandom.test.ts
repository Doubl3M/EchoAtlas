import { describe, expect, it, vi } from "vitest";

import { DeterministicRandom, Seed } from "../../../src/engine/math";

function takeUint32(random: DeterministicRandom, count: number): number[] {
    return Array.from({ length: count }, () => random.nextUint32());
}

describe("DeterministicRandom", () => {
    it("keeps exact sequence references for numeric and textual seeds", () => {
        expect(takeUint32(new DeterministicRandom(0), 5)).toEqual([
            63473646, 1273652441, 2497718339, 2830765411, 3563018852,
        ]);
        expect(takeUint32(new DeterministicRandom("EchoAtlas"), 5)).toEqual([
            2322371386, 1168503223, 230284279, 4180750421, 415526397,
        ]);
    });

    it("repeats a sequence for the same seed", () => {
        const first = takeUint32(new DeterministicRandom(987654321), 32);
        const second = takeUint32(new DeterministicRandom(new Seed(987654321)), 32);

        expect(second).toEqual(first);
    });

    it("produces different sequences for different seeds", () => {
        const first = takeUint32(new DeterministicRandom(1), 16);
        const second = takeUint32(new DeterministicRandom(2), 16);

        expect(second).not.toEqual(first);
    });

    it("creates reproducible forks independent of parent progress", () => {
        const firstParent = new DeterministicRandom("world");
        const firstFork = firstParent.fork("terrain");
        takeUint32(firstParent, 20);
        const delayedFork = firstParent.fork("terrain");
        const secondFork = new DeterministicRandom("world").fork("terrain");

        expect(takeUint32(delayedFork, 16)).toEqual(takeUint32(firstFork, 16));
        expect(takeUint32(secondFork, 16)).toEqual(
            takeUint32(new DeterministicRandom("world").fork("terrain"), 16)
        );
        expect(takeUint32(new DeterministicRandom("world").fork("cities"), 16)).not.toEqual(
            takeUint32(new DeterministicRandom("world").fork("terrain"), 16)
        );
        expect(takeUint32(firstParent.fork(42), 4)).toEqual(
            takeUint32(new DeterministicRandom("world").fork(42), 4)
        );
    });

    it("separates numeric and textual fork label namespaces", () => {
        const parent = new DeterministicRandom("world");

        expect(takeUint32(parent.fork(1), 16)).not.toEqual(takeUint32(parent.fork("1"), 16));
        expect(takeUint32(parent.fork(1), 16)).toEqual(
            takeUint32(new DeterministicRandom("world").fork(1), 16)
        );
    });

    it("keeps generated values inside their requested bounds", () => {
        const random = new DeterministicRandom(1234);

        for (let index = 0; index < 2_000; index += 1) {
            const float = random.nextFloat();
            const integer = random.nextInt(-10, 13);
            const ranged = random.nextRange(-2.5, 7.25);

            expect(float).toBeGreaterThanOrEqual(0);
            expect(float).toBeLessThan(1);
            expect(Number.isInteger(integer)).toBe(true);
            expect(integer).toBeGreaterThanOrEqual(-10);
            expect(integer).toBeLessThan(13);
            expect(ranged).toBeGreaterThanOrEqual(-2.5);
            expect(ranged).toBeLessThan(7.25);
        }
    });

    it("supports exact probability boundaries", () => {
        const random = new DeterministicRandom(88);

        expect(random.nextBoolean(0)).toBe(false);
        expect(random.nextBoolean(1)).toBe(true);
        expect(typeof random.nextBoolean()).toBe("boolean");
    });

    it("uses rejection sampling for integer ranges that do not divide 2^32", () => {
        const random = new DeterministicRandom("EchoAtlas");
        const nextUint32 = vi.spyOn(random, "nextUint32");

        expect(random.nextInt(0, 0x80000001)).toBe(1168503223);
        expect(nextUint32).toHaveBeenCalledTimes(2);
    });

    it("supports narrow, signed, crossing-zero, and maximum-width integer ranges", () => {
        const random = new DeterministicRandom("integer-boundaries");

        expect(random.nextInt(-8, -7)).toBe(-8);

        const negative = random.nextInt(-100, -20);
        const crossingZero = random.nextInt(-50, 51);
        const fullUint32Width = random.nextInt(-0x80000000, 0x80000000);
        const nearSafeLimit = random.nextInt(Number.MAX_SAFE_INTEGER - 2, Number.MAX_SAFE_INTEGER);

        expect(negative).toBeGreaterThanOrEqual(-100);
        expect(negative).toBeLessThan(-20);
        expect(crossingZero).toBeGreaterThanOrEqual(-50);
        expect(crossingZero).toBeLessThan(51);
        expect(fullUint32Width).toBeGreaterThanOrEqual(-0x80000000);
        expect(fullUint32Width).toBeLessThan(0x80000000);
        expect(Number.isSafeInteger(nearSafeLimit)).toBe(true);
        expect(nearSafeLimit).toBeGreaterThanOrEqual(Number.MAX_SAFE_INTEGER - 2);
        expect(nearSafeLimit).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });

    it("rejects invalid bounds, probabilities, and fork labels", () => {
        const random = new DeterministicRandom(1);

        expect(() => random.nextInt(1.5, 2)).toThrow(RangeError);
        expect(() => random.nextInt(Number.MIN_SAFE_INTEGER - 1, 0)).toThrow(RangeError);
        expect(() => random.nextInt(0, Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
        expect(() => random.nextInt(2, 2)).toThrow(RangeError);
        expect(() => random.nextInt(0, 0x100000001)).toThrow(RangeError);
        expect(() => random.nextRange(Number.NaN, 1)).toThrow(RangeError);
        expect(() => random.nextRange(1, 1)).toThrow(RangeError);
        expect(() => random.nextRange(-Number.MAX_VALUE, Number.MAX_VALUE)).toThrow(RangeError);
        expect(() => random.nextBoolean(-0.1)).toThrow(RangeError);
        expect(() => random.nextBoolean(1.1)).toThrow(RangeError);
        expect(() => random.nextBoolean(Number.NaN)).toThrow(RangeError);
        expect(() => random.nextBoolean(Number.POSITIVE_INFINITY)).toThrow(RangeError);
        expect(() => random.nextBoolean(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
        expect(() => random.fork(1.5)).toThrow(RangeError);
    });
});
