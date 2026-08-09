import { describe, expect, it } from "vitest";

import { SeventiesTheme } from "../../src/render";

describe("SeventiesTheme", () => {
    it("is deeply immutable", () => {
        const theme = new SeventiesTheme();

        expect(Object.isFrozen(theme)).toBe(true);
        expect(Object.isFrozen(theme.backgroundTexture)).toBe(true);
        expect(Object.isFrozen(theme.terrainBands)).toBe(true);
        expect(theme.terrainBands.every((band) => Object.isFrozen(band))).toBe(true);
        expect(Object.isFrozen(theme.terrain)).toBe(true);
        expect(Object.isFrozen(theme.terrain.contour)).toBe(true);
        expect(Object.isFrozen(theme.terrain.water)).toBe(true);
        expect(Object.isFrozen(theme.terrain.ornaments)).toBe(true);
        expect(Object.isFrozen(theme.connection)).toBe(true);
        expect(Object.isFrozen(theme.location)).toBe(true);
        expect(Object.isFrozen(theme.landmarks)).toBe(true);
        expect(Object.isFrozen(theme.landmarks.city)).toBe(true);
        expect(Object.isFrozen(theme.label)).toBe(true);
        expect(() => Object.assign(theme.location as { radius: number }, { radius: 100 })).toThrow(
            TypeError
        );
    });

    it("defines ordered normalized elevation bands", () => {
        const theme = new SeventiesTheme();

        expect(theme.terrainBands).toEqual([
            { maximum: 0.12, color: "#456f70" },
            { maximum: 0.24, color: "#5f8580" },
            { maximum: 0.36, color: "#879276" },
            { maximum: 0.48, color: "#a3a06d" },
            { maximum: 0.6, color: "#b9a36a" },
            { maximum: 0.7, color: "#c99558" },
            { maximum: 0.8, color: "#bd7849" },
            { maximum: 0.9, color: "#925a3d" },
            { maximum: 1, color: "#684536" },
        ]);
    });

    it("shows labels only from its selected detail threshold", () => {
        expect(new SeventiesTheme().label.minZoom).toBe(0);
    });

    it("keeps compact cities restrained and detailed cities in the illustrated range", () => {
        const city = new SeventiesTheme().landmarks.city;

        expect(city.compactWidth).toBe(20);
        expect(city.detailedWidth * (1 - city.widthVariation)).toBeGreaterThanOrEqual(45);
        expect(city.detailedWidth * (1 + city.widthVariation)).toBeLessThanOrEqual(60);
    });
});
