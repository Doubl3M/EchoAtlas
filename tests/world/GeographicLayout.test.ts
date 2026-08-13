import { describe, expect, it } from "vitest";

import {
    GeographicContent,
    GeographicFeature,
    GeographicHierarchy,
    GeographicLayout,
    type GeographicPlacement,
    type GeographicRegionPlacement,
    type GeographicRole,
    type GeographicSitePlacement,
} from "../../src/world";

describe("GeographicLayout", () => {
    it("supports an immutable empty layout for an empty hierarchy", () => {
        const layout = new GeographicLayout({
            hierarchy: new GeographicHierarchy(),
            width: 100,
            height: 50,
        });
        expect(layout.getPlacements()).toEqual([]);
        expect(Object.isFrozen(layout)).toBe(true);
        expect(Object.isFrozen(layout.getPlacements())).toBe(true);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid World dimension %s",
        (dimension) => {
            expect(
                () =>
                    new GeographicLayout({
                        hierarchy: new GeographicHierarchy(),
                        width: dimension,
                        height: 10,
                    })
            ).toThrow("layout width must be finite and greater than zero");
            expect(
                () =>
                    new GeographicLayout({
                        hierarchy: new GeographicHierarchy(),
                        width: 10,
                        height: dimension,
                    })
            ).toThrow("layout height must be finite and greater than zero");
        }
    );

    it("accepts a root Region and includes the continuous World boundary", () => {
        const root = feature("root", "continent");
        const placement = region("root", 0, 0, 100, 50, 100, 50);
        const layout = layoutOf([root], [placement]);
        expect(layout.getRegionPlacementByFeatureId(root.id)).toEqual(placement);
        expect(layout.getSitePlacementByFeatureId(root.id)).toBeUndefined();
    });

    it("accepts a root Site because it contains no child", () => {
        const root = feature("root");
        const placement = site(root.id, 100, 50);
        const layout = layoutOf([root], [placement]);
        expect(layout.getSitePlacementByFeatureId(root.id)).toEqual(placement);
    });

    it("accepts contained child Regions and Sites", () => {
        const root = feature("root", "continent");
        const child = feature("child", "district", root.id);
        const leaf = feature("leaf", "building", child.id);
        const layout = layoutOf(
            [leaf, root, child],
            [
                site(leaf.id, 25, 25),
                region(child.id, 10, 10, 40, 40, 20, 20),
                region(root.id, 0, 0, 100, 50, 50, 25),
            ]
        );
        expect(layout.getPlacements().map(({ featureId }) => featureId)).toEqual([
            "child",
            "leaf",
            "root",
        ]);
    });

    it("rejects a child Region extending beyond its parent", () => {
        const root = feature("root", "continent");
        const child = feature("child", "district", root.id);
        expect(() =>
            layoutOf(
                [root, child],
                [region(root.id, 10, 10, 90, 40), region(child.id, 0, 20, 30, 30)]
            )
        ).toThrow("Region must be contained by its parent: child");
    });

    it("rejects a child Site outside its parent", () => {
        const root = feature("root", "continent");
        const child = feature("child", "building", root.id);
        expect(() =>
            layoutOf([root, child], [region(root.id, 10, 10, 90, 40), site(child.id, 5, 20)])
        ).toThrow("Site must be contained by its parent: child");
    });

    it("rejects a Site parent because Sites cannot contain features", () => {
        const root = feature("root");
        const child = feature("child", "building", root.id);
        expect(() =>
            layoutOf([root, child], [site(root.id, 20, 20), site(child.id, 20, 20)])
        ).toThrow("parent placement must be a Region: root");
    });

    it("rejects a Region anchor outside its bounds", () => {
        const root = feature("root", "continent");
        expect(() => layoutOf([root], [region(root.id, 10, 10, 20, 20, 9, 15)])).toThrow(
            "anchor must be inside its bounds"
        );
    });

    it("rejects unknown, missing and duplicate placement identities", () => {
        const known = feature("known");
        expect(() => layoutOf([known], [site("unknown", 1, 1)])).toThrow(
            "Unknown geographic placement feature ID: unknown"
        );
        expect(() => layoutOf([known], [])).toThrow(
            "Missing geographic placement for feature ID: known"
        );
        expect(() => layoutOf([known], [site(known.id, 1, 1), site(known.id, 2, 2)])).toThrow(
            "Duplicate geographic placement feature ID: known"
        );
    });

    it.each([Number.NaN, Number.NEGATIVE_INFINITY])(
        "rejects non-finite placement coordinate %s",
        (coordinate) => {
            const root = feature("root");
            expect(() => layoutOf([root], [site(root.id, coordinate, 2)])).toThrow(
                "coordinates must be finite"
            );
        }
    );

    it("rejects invalid or out-of-World Region bounds and Sites", () => {
        const root = feature("root", "continent");
        expect(() => layoutOf([root], [region(root.id, 10, 10, 10, 20)])).toThrow(
            "positive width and height"
        );
        expect(() => layoutOf([root], [region(root.id, 0, 0, 101, 20)])).toThrow(
            "bounds must be inside the World extent"
        );
        expect(() => layoutOf([root], [site(root.id, 101, 20)])).toThrow(
            "position must be inside the World extent"
        );
    });

    it("is canonical and independent from input order", () => {
        const features = [feature("z"), feature("a")];
        const placements = [site("z", 2, 2), site("a", 1, 1)];
        const forward = layoutOf(features, placements);
        const reverse = layoutOf([...features].reverse(), [...placements].reverse());
        expect(reverse.getPlacements()).toEqual(forward.getPlacements());
        expect(forward.getPlacements().map(({ featureId }) => featureId)).toEqual(["a", "z"]);
    });

    it("defensively copies placements and their nested geometry", () => {
        const root = feature("root", "continent");
        const bounds = { x0: 0, y0: 0, x1: 50, y1: 40 };
        const anchor = { x: 20, y: 20 };
        const placement: GeographicRegionPlacement = {
            kind: "region",
            featureId: root.id,
            bounds,
            anchor,
        };
        const placements: GeographicPlacement[] = [placement];
        const layout = layoutOf([root], placements);
        bounds.x1 = 1;
        anchor.x = 1;
        placements.length = 0;
        expect(layout.getRegionPlacementByFeatureId(root.id)?.bounds.x1).toBe(50);
        expect(layout.getRegionPlacementByFeatureId(root.id)?.anchor.x).toBe(20);
        expect(Object.isFrozen(layout.getPlacementByFeatureId(root.id))).toBe(true);
        expect(Object.isFrozen(layout.getRegionPlacementByFeatureId(root.id)?.bounds)).toBe(true);
    });

    it("places every geographic representation of one Knowledge identity separately", () => {
        const first = feature("district:a", "district", undefined, "knowledge:artist");
        const second = feature("district:b", "district", undefined, "knowledge:artist");
        const layout = layoutOf([first, second], [site(first.id, 10, 10), site(second.id, 80, 40)]);
        expect(layout.getPlacements()).toHaveLength(2);
        expect(layout.getPlacementByFeatureId(first.id)).not.toEqual(
            layout.getPlacementByFeatureId(second.id)
        );
    });

    it("requires no placement for GeographicContent", () => {
        const building = feature("building");
        const hierarchy = new GeographicHierarchy({
            features: [building],
            contents: [
                new GeographicContent({
                    id: "content",
                    knowledgeNodeId: "knowledge:content",
                    containerFeatureId: building.id,
                }),
            ],
        });
        const layout = new GeographicLayout({
            hierarchy,
            width: 100,
            height: 50,
            placements: [site(building.id, 20, 20)],
        });
        expect(layout.getPlacements()).toHaveLength(1);
    });

    it("supports arbitrary additional Region depth without role-specific validation", () => {
        const root = feature("root", "continent");
        const extra = feature("extra", "district", root.id);
        const nested = feature("nested", "district", extra.id);
        const leaf = feature("leaf", "building", nested.id);
        expect(() =>
            layoutOf(
                [root, extra, nested, leaf],
                [
                    region(root.id, 0, 0, 100, 50),
                    region(extra.id, 5, 5, 90, 45),
                    region(nested.id, 10, 10, 80, 40),
                    site(leaf.id, 20, 20),
                ]
            )
        ).not.toThrow();
    });
});

function feature(
    id: string,
    role: GeographicRole = "building",
    parentId?: string,
    sourceKnowledgeNodeId?: string
): GeographicFeature {
    return new GeographicFeature({ id, role, parentId, sourceKnowledgeNodeId });
}

function region(
    featureId: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    anchorX = (x0 + x1) / 2,
    anchorY = (y0 + y1) / 2
): GeographicRegionPlacement {
    return {
        kind: "region",
        featureId,
        bounds: { x0, y0, x1, y1 },
        anchor: { x: anchorX, y: anchorY },
    };
}

function site(featureId: string, x: number, y: number): GeographicSitePlacement {
    return { kind: "site", featureId, position: { x, y } };
}

function layoutOf(
    features: readonly GeographicFeature[],
    placements: readonly GeographicPlacement[]
): GeographicLayout {
    return new GeographicLayout({
        hierarchy: new GeographicHierarchy({ features }),
        width: 100,
        height: 50,
        placements,
    });
}
