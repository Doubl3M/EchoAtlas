import { describe, expect, it } from "vitest";

import { TerrainConfig, type TerrainConfigOptions } from "../../../src/engine/terrain";

const referenceOptions: TerrainConfigOptions = {
    width: 8,
    height: 6,
    baseFrequency: 0.125,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    offsetX: -3.25,
    offsetY: 7.5,
};

function createConfig(overrides: Partial<TerrainConfigOptions> = {}): TerrainConfig {
    return new TerrainConfig({ ...referenceOptions, ...overrides });
}

describe("TerrainConfig", () => {
    it("retains validated values and is immutable", () => {
        const config = createConfig();

        expect(config).toEqual(referenceOptions);
        expect(Object.isFrozen(config)).toBe(true);
        expect(Reflect.set(config, "width", 99)).toBe(false);
        expect(config.width).toBe(8);
    });

    it.each([
        ["zero", 0],
        ["negative", -1],
        ["fractional", 1.5],
        ["NaN", Number.NaN],
        ["infinite", Number.POSITIVE_INFINITY],
    ])("rejects a %s width", (_name, width) => {
        expect(() => createConfig({ width })).toThrow(RangeError);
    });

    it.each([
        ["zero", 0],
        ["negative", -1],
        ["fractional", 1.5],
        ["NaN", Number.NaN],
        ["infinite", Number.NEGATIVE_INFINITY],
    ])("rejects a %s height", (_name, height) => {
        expect(() => createConfig({ height })).toThrow(RangeError);
    });

    it.each([0, -0.1, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid base frequency %s",
        (baseFrequency) => {
            expect(() => createConfig({ baseFrequency })).toThrow(RangeError);
        }
    );

    it.each([0, -1, 1.5, 17, Number.NaN])("rejects invalid octave count %s", (octaves) => {
        expect(() => createConfig({ octaves })).toThrow(RangeError);
    });

    it.each([0, -0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid persistence %s",
        (persistence) => {
            expect(() => createConfig({ persistence })).toThrow(RangeError);
        }
    );

    it.each([1, 0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid lacunarity %s",
        (lacunarity) => {
            expect(() => createConfig({ lacunarity })).toThrow(RangeError);
        }
    );

    it("rejects non-finite offsets", () => {
        expect(() => createConfig({ offsetX: Number.NaN })).toThrow(RangeError);
        expect(() => createConfig({ offsetY: Number.POSITIVE_INFINITY })).toThrow(RangeError);
    });

    it("rejects configurations outside the safe noise sampling domain", () => {
        expect(() => createConfig({ baseFrequency: Number.MAX_VALUE })).toThrow(RangeError);
        expect(() => createConfig({ offsetX: Number.MAX_VALUE })).toThrow(RangeError);
    });

    it("rejects dimensions beyond the supported Float64Array length", () => {
        expect(() => createConfig({ width: 0x100000000, height: 1 })).toThrow(RangeError);
        expect(() => createConfig({ width: Number.MAX_SAFE_INTEGER, height: 2 })).toThrow(
            RangeError
        );
    });

    it("accepts the documented fBm parameter boundaries", () => {
        expect(createConfig({ octaves: 1, persistence: 1 }).octaves).toBe(1);
        expect(createConfig({ octaves: 16 }).octaves).toBe(16);
    });
});
