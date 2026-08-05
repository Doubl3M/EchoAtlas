import { describe, expect, it } from "vitest";

import { hashCoordinate2D, hashString, hashToFloat, mixUint32 } from "../../../src/engine/math";

describe("hash functions", () => {
    it("keeps exact string hash references including Unicode", () => {
        expect(hashString("")).toBe(2872998923);
        expect(hashString("EchoAtlas")).toBe(3024527161);
        expect(hashString("音楽🌍")).toBe(2761701977);
    });

    it("mixes uint32 values with stable references", () => {
        expect(mixUint32(0)).toBe(91794203);
        expect(mixUint32(1, 2, 3)).toBe(1315153499);
        expect(mixUint32(0xffffffff, 0, 42)).toBe(2487904570);
    });

    it("hashes negative 2D coordinates deterministically", () => {
        const first = hashCoordinate2D(-17, -31, 123456789);
        const second = hashCoordinate2D(-17, -31, 123456789);

        expect(first).toBe(1329148014);
        expect(second).toBe(first);
        expect(hashCoordinate2D(-17, -30, 123456789)).not.toBe(first);
    });

    it("supports coordinates at signed 32-bit boundaries", () => {
        const first = hashCoordinate2D(-0x80000000, 0x7fffffff, 42);
        const second = hashCoordinate2D(-0x80000000, 0x7fffffff, 42);

        expect(first).toBe(second);
        expect(first).not.toBe(hashCoordinate2D(-0x7fffffff, 0x7fffffff, 42));
    });

    it("maps the complete uint32 domain into [0, 1)", () => {
        expect(hashToFloat(0)).toBe(0);
        expect(hashToFloat(0xffffffff)).toBeCloseTo(0.9999999997671694, 15);
    });

    it("rejects invalid hash inputs", () => {
        expect(() => mixUint32()).toThrow(RangeError);
        expect(() => mixUint32(-1)).toThrow(RangeError);
        expect(() => mixUint32(0x100000000)).toThrow(RangeError);
        expect(() => hashCoordinate2D(0.5, 0, 0)).toThrow(RangeError);
        expect(() => hashCoordinate2D(0, -0.5, 0)).toThrow(RangeError);
        expect(() => hashCoordinate2D(Number.NaN, 0, 0)).toThrow(RangeError);
        expect(() => hashCoordinate2D(0, Number.POSITIVE_INFINITY, 0)).toThrow(RangeError);
        expect(() => hashCoordinate2D(0, 0, -1)).toThrow(RangeError);
        expect(() => hashToFloat(Number.NaN)).toThrow(RangeError);
    });
});
