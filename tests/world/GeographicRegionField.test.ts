import { describe, expect, it } from "vitest";

import {
    GeographicFeature,
    GeographicHierarchy,
    GeographicLayout,
    GeographicRegionField,
} from "../../src/world";

describe("GeographicRegionField", () => {
    it("stores compact immutable ownership and samples the inclusive World boundary", () => {
        const region = new GeographicFeature({ id: "region", role: "continent" });
        const layout = new GeographicLayout({
            hierarchy: new GeographicHierarchy({ features: [region] }),
            width: 100,
            height: 50,
            placements: [
                {
                    kind: "region",
                    featureId: region.id,
                    bounds: { x0: 0, y0: 0, x1: 100, y1: 50 },
                    anchor: { x: 50, y: 25 },
                },
            ],
        });
        const owners = [undefined, region.id, region.id, undefined];
        const field = new GeographicRegionField({
            layout,
            columns: 2,
            rows: 2,
            ownerFeatureIds: owners,
        });
        owners.fill("changed");

        expect(field.worldWidth).toBe(100);
        expect(field.worldHeight).toBe(50);
        expect(field.getColumnCount()).toBe(2);
        expect(field.getRowCount()).toBe(2);
        expect(field.getOwnerFeatureId(0, 0)).toBeUndefined();
        expect(field.getOwnerFeatureId(1, 0)).toBe(region.id);
        expect(field.getOwnerFeatureIdAtWorldPosition(100, 0)).toBe(region.id);
        expect(field.getOwnerFeatureIdAtWorldPosition(100, 50)).toBeUndefined();
        expect(Object.isFrozen(field)).toBe(true);
    });

    it.each([0, -1, 1.5, Number.NaN])("rejects invalid resolution %s", (resolution) => {
        const layout = emptyLayout();
        expect(
            () =>
                new GeographicRegionField({
                    layout,
                    columns: resolution,
                    rows: 1,
                    ownerFeatureIds: [],
                })
        ).toThrow("columns must be a positive safe integer");
        expect(
            () =>
                new GeographicRegionField({
                    layout,
                    columns: 1,
                    rows: resolution,
                    ownerFeatureIds: [],
                })
        ).toThrow("rows must be a positive safe integer");
    });

    it("rejects ownership storage with the wrong size", () => {
        expect(
            () =>
                new GeographicRegionField({
                    layout: emptyLayout(),
                    columns: 2,
                    rows: 2,
                    ownerFeatureIds: [],
                })
        ).toThrow("ownership must match its exact cell count");
    });

    it("rejects unknown and Site owners", () => {
        const root = new GeographicFeature({ id: "root", role: "continent" });
        const site = new GeographicFeature({ id: "site", role: "building", parentId: root.id });
        const hierarchy = new GeographicHierarchy({ features: [root, site] });
        const layout = new GeographicLayout({
            hierarchy,
            width: 100,
            height: 50,
            placements: [
                {
                    kind: "region",
                    featureId: root.id,
                    bounds: { x0: 0, y0: 0, x1: 100, y1: 50 },
                    anchor: { x: 50, y: 25 },
                },
                { kind: "site", featureId: site.id, position: { x: 50, y: 25 } },
            ],
        });
        expect(
            () =>
                new GeographicRegionField({
                    layout,
                    columns: 1,
                    rows: 1,
                    ownerFeatureIds: ["missing"],
                })
        ).toThrow("Unknown geographic region owner feature ID: missing");
        expect(
            () =>
                new GeographicRegionField({
                    layout,
                    columns: 1,
                    rows: 1,
                    ownerFeatureIds: [site.id],
                })
        ).toThrow("owner must have a Region placement: site");
    });

    it("rejects invalid cells and World positions rather than clamping publicly", () => {
        const field = new GeographicRegionField({
            layout: emptyLayout(),
            columns: 1,
            rows: 1,
            ownerFeatureIds: [undefined],
        });
        expect(() => field.getOwnerFeatureId(1, 0)).toThrow("valid geographic region field cell");
        expect(() => field.getOwnerFeatureIdAtWorldPosition(-1, 0)).toThrow(
            "inside the logical World extent"
        );
        expect(() => field.getOwnerFeatureIdAtWorldPosition(Number.NaN, 0)).toThrow(
            "inside the logical World extent"
        );
    });
});

function emptyLayout(): GeographicLayout {
    return new GeographicLayout({
        hierarchy: new GeographicHierarchy(),
        width: 100,
        height: 50,
    });
}
