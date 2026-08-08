import { describe, expect, it } from "vitest";

import { TerrainConfig } from "../../src/engine/terrain";
import { WorldConfig, type WorldConfigOptions } from "../../src/world";

function terrain(width = 8, height = 6): TerrainConfig {
    return new TerrainConfig({
        width,
        height,
        baseFrequency: 0.1,
        octaves: 3,
        persistence: 0.5,
        lacunarity: 2,
        offsetX: -2,
        offsetY: 3,
    });
}

function options(overrides: Partial<WorldConfigOptions> = {}): WorldConfigOptions {
    return {
        generationVersion: "world-v1-exact",
        width: 8,
        height: 6,
        placementIterations: 12,
        attractionStrength: 0.04,
        repulsionStrength: 0.3,
        terrain: terrain(),
        ...overrides,
    };
}

describe("WorldConfig", () => {
    it("creates an immutable configuration", () => {
        const config = new WorldConfig(options());

        expect(config).toEqual(options());
        expect(config.generationVersion).toBe("world-v1-exact");
        expect(Object.isFrozen(config)).toBe(true);
    });

    it.each(["world-v2-unknown", "", 1, null, undefined])(
        "rejects the unsupported generation version %s at runtime",
        (generationVersion) => {
            expect(
                () =>
                    new WorldConfig({
                        ...options(),
                        generationVersion,
                    } as unknown as WorldConfigOptions)
            ).toThrow("generationVersion must be a supported World generation version.");
        }
    );

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects the invalid width %s",
        (width) => {
            expect(() => new WorldConfig(options({ width }))).toThrow(RangeError);
        }
    );

    it.each([0, -1, 1.5, Number.NaN, Number.NEGATIVE_INFINITY])(
        "rejects the invalid height %s",
        (height) => {
            expect(() => new WorldConfig(options({ height }))).toThrow(RangeError);
        }
    );

    it.each([-1, 1.5, 1_001, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects the invalid iteration count %s",
        (placementIterations) => {
            expect(() => new WorldConfig(options({ placementIterations }))).toThrow(RangeError);
        }
    );

    it.each([-1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects the invalid attraction strength %s",
        (attractionStrength) => {
            expect(() => new WorldConfig(options({ attractionStrength }))).toThrow(RangeError);
        }
    );

    it.each([-1, 1.1, Number.NaN, Number.NEGATIVE_INFINITY])(
        "rejects the invalid repulsion strength %s",
        (repulsionStrength) => {
            expect(() => new WorldConfig(options({ repulsionStrength }))).toThrow(RangeError);
        }
    );

    it("accepts the documented boundary values", () => {
        expect(
            new WorldConfig(
                options({ placementIterations: 0, attractionStrength: 0, repulsionStrength: 1 })
            )
        ).toBeInstanceOf(WorldConfig);
    });

    it("accepts an explicit terrain resolution independent of the World extent", () => {
        const config = new WorldConfig(options({ terrain: terrain(4, 3) }));

        expect(config.width).toBe(8);
        expect(config.height).toBe(6);
        expect(config.terrain.width).toBe(4);
        expect(config.terrain.height).toBe(3);
    });
});
