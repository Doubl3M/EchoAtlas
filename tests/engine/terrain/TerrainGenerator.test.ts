import { describe, expect, it } from "vitest";

import { Seed, ValueNoise2D } from "../../../src/engine/math";
import {
    TerrainConfig,
    TerrainGenerator,
    type TerrainConfigOptions,
} from "../../../src/engine/terrain";

const referenceOptions: TerrainConfigOptions = {
    width: 3,
    height: 2,
    baseFrequency: 0.2,
    octaves: 3,
    persistence: 0.5,
    lacunarity: 2,
    offsetX: -1.25,
    offsetY: -2.5,
};

function createConfig(overrides: Partial<TerrainConfigOptions> = {}): TerrainConfig {
    return new TerrainConfig({ ...referenceOptions, ...overrides });
}

describe("TerrainGenerator", () => {
    it("keeps exact row-major values for a reference seed and configuration", () => {
        const field = new TerrainGenerator().generate("terrain-reference", createConfig());

        expect(field.toArray()).toEqual([
            0.5746811346673765, 0.5487768098086336, 0.5306341925184289, 0.41603215600935567,
            0.4822427224745595, 0.5027942311525545,
        ]);
    });

    it("reproduces fields exactly for identical inputs and successive calls", () => {
        const generator = new TerrainGenerator();
        const config = createConfig({ width: 5, height: 4 });
        const first = generator.generate(new Seed(123456), config).toArray();
        generator.generate("unrelated", config);
        const second = generator.generate(new Seed(123456), config).toArray();

        expect(second).toEqual(first);
    });

    it.each([42, "42"])("matches ValueNoise2D exactly for one octave and seed %s", (seed) => {
        const config = createConfig({ width: 4, height: 3, octaves: 1 });
        const field = new TerrainGenerator().generate(seed, config);
        const noise = new ValueNoise2D(seed);

        for (let y = 0; y < config.height; y += 1) {
            for (let x = 0; x < config.width; x += 1) {
                const expected = noise.sample(
                    (x + config.offsetX) * config.baseFrequency,
                    (y + config.offsetY) * config.baseFrequency
                );
                expect(field.get(x, y)).toBe(expected);
            }
        }
    });

    it("keeps overlapping samples independent of grid dimensions", () => {
        const generator = new TerrainGenerator();
        const small = generator.generate(99, createConfig({ width: 2, height: 2 }));
        const large = generator.generate(99, createConfig({ width: 5, height: 4 }));

        for (let y = 0; y < small.height; y += 1) {
            for (let x = 0; x < small.width; x += 1) {
                expect(large.get(x, y)).toBe(small.get(x, y));
            }
        }
    });

    it("produces different fields for different seeds", () => {
        const generator = new TerrainGenerator();
        const config = createConfig({ width: 4, height: 4 });

        expect(generator.generate("first", config).toArray()).not.toEqual(
            generator.generate("second", config).toArray()
        );
    });

    it("supports negative offsets", () => {
        const field = new TerrainGenerator().generate(
            42,
            createConfig({ offsetX: -100.5, offsetY: -250.25 })
        );

        expect(field.width).toBe(3);
        expect(field.height).toBe(2);
        expect(field.toArray().every((value) => value >= 0 && value <= 1)).toBe(true);
    });

    it.each([
        [1, 1],
        [1, 7],
        [9, 1],
    ])("supports a %s × %s field", (width, height) => {
        const field = new TerrainGenerator().generate(7, createConfig({ width, height }));

        expect(field.width).toBe(width);
        expect(field.height).toBe(height);
        expect(field.toArray()).toHaveLength(width * height);
    });

    it("keeps every sample normalized across varied configurations", () => {
        const generator = new TerrainGenerator();
        const configs = [
            createConfig({ width: 16, height: 12, octaves: 1 }),
            createConfig({ width: 13, height: 9, octaves: 8, persistence: 0.75 }),
            createConfig({
                width: 11,
                height: 10,
                baseFrequency: 0.01,
                lacunarity: 3,
                offsetX: -500,
                offsetY: 800,
            }),
        ];

        for (const config of configs) {
            const values = generator.generate("normalized", config).toArray();
            expect(values.every((value) => value >= 0 && value <= 1)).toBe(true);
        }
    });

    it("keeps maximum-octave accumulation finite", () => {
        const config = createConfig({ octaves: 16, persistence: 1, width: 4, height: 3 });
        const values = new TerrainGenerator().generate("maximum-octaves", config).toArray();

        expect(values.every((value) => Number.isFinite(value))).toBe(true);
    });
});
