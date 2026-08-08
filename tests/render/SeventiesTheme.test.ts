import { describe, expect, it } from "vitest";

import { SeventiesTheme } from "../../src/render";

describe("SeventiesTheme", () => {
    it("is deeply immutable", () => {
        const theme = new SeventiesTheme();

        expect(Object.isFrozen(theme)).toBe(true);
        expect(Object.isFrozen(theme.terrainBands)).toBe(true);
        expect(theme.terrainBands.every((band) => Object.isFrozen(band))).toBe(true);
        expect(Object.isFrozen(theme.connection)).toBe(true);
        expect(Object.isFrozen(theme.location)).toBe(true);
        expect(Object.isFrozen(theme.label)).toBe(true);
        expect(() => Object.assign(theme.location as { radius: number }, { radius: 100 })).toThrow(
            TypeError
        );
    });

    it("defines ordered normalized elevation bands", () => {
        const theme = new SeventiesTheme();

        expect(theme.terrainBands).toEqual([
            { maximum: 0.2, color: "#315f5b" },
            { maximum: 0.4, color: "#6f7b45" },
            { maximum: 0.6, color: "#a49a55" },
            { maximum: 0.8, color: "#c67a3d" },
            { maximum: 1, color: "#74452f" },
        ]);
    });

    it("shows labels only from its selected detail threshold", () => {
        expect(new SeventiesTheme().label.minZoom).toBe(12);
    });
});
