import { describe, expect, it } from "vitest";

import {
    GeographicAppearanceSnapshot,
    GeographicFeature,
    GeographicFeatureAppearance,
    GeographicHierarchy,
} from "../../src/world";

describe("GeographicAppearanceSnapshot", () => {
    it("represents an immutable empty sparse snapshot whose missing entries are normal", () => {
        const snapshot = new GeographicAppearanceSnapshot({ hierarchy: hierarchy() });

        expect(snapshot.getAppearances()).toEqual([]);
        expect(snapshot.getAppearance("district")).toBeUndefined();
        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.getAppearances())).toBe(true);
    });

    it("stores and resolves a ruined feature without replacing its identity", () => {
        const appearance = ruined("district");
        const snapshot = new GeographicAppearanceSnapshot({
            hierarchy: hierarchy(),
            appearances: [appearance],
        });

        expect(snapshot.getAppearance("district")).toBe(appearance);
        expect(snapshot.getAppearance("continent")).toBeUndefined();
        expect(Object.isFrozen(appearance)).toBe(true);
    });

    it("orders appearances canonically and independently from input order", () => {
        const source = hierarchy();
        const first = new GeographicAppearanceSnapshot({
            hierarchy: source,
            appearances: [ruined("district"), ruined("continent")],
        });
        const second = new GeographicAppearanceSnapshot({
            hierarchy: source,
            appearances: [ruined("continent"), ruined("district")],
        });

        expect(first.getAppearances().map(({ featureId }) => featureId)).toEqual([
            "continent",
            "district",
        ]);
        expect(second.getAppearances()).toEqual(first.getAppearances());
    });

    it("rejects duplicate and unknown feature references", () => {
        expect(
            () =>
                new GeographicAppearanceSnapshot({
                    hierarchy: hierarchy(),
                    appearances: [ruined("district"), ruined("district")],
                })
        ).toThrow("Duplicate geographic appearance");
        expect(
            () =>
                new GeographicAppearanceSnapshot({
                    hierarchy: hierarchy(),
                    appearances: [ruined("unknown")],
                })
        ).toThrow("Unknown appearance geographic feature ID");
    });

    it("rejects invalid IDs, conditions and non-appearance inputs", () => {
        expect(() => ruined(" district")).toThrow(TypeError);
        expect(
            () =>
                new GeographicFeatureAppearance({
                    featureId: "district",
                    condition: "normal" as "ruined",
                })
        ).toThrow("Unsupported geographic appearance condition");
        expect(
            () =>
                new GeographicAppearanceSnapshot({
                    hierarchy: hierarchy(),
                    appearances: [{} as GeographicFeatureAppearance],
                })
        ).toThrow("require GeographicFeatureAppearance");
    });

    it("defensively copies input and returned arrays", () => {
        const appearance = ruined("district");
        const appearances = [appearance];
        const snapshot = new GeographicAppearanceSnapshot({ hierarchy: hierarchy(), appearances });

        appearances.length = 0;
        const returned = snapshot.getAppearances() as GeographicFeatureAppearance[];
        expect(() => returned.pop()).toThrow();
        expect(snapshot.getAppearances()).toEqual([appearance]);
        expect(snapshot.getAppearances()).not.toBe(returned);
    });
});

function hierarchy(): GeographicHierarchy {
    return new GeographicHierarchy({
        features: [
            new GeographicFeature({ id: "continent", role: "continent" }),
            new GeographicFeature({ id: "district", role: "district", parentId: "continent" }),
        ],
    });
}

function ruined(featureId: string): GeographicFeatureAppearance {
    return new GeographicFeatureAppearance({ featureId, condition: "ruined" });
}
