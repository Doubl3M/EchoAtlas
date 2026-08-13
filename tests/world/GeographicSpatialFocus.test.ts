import { describe, expect, it } from "vitest";

import {
    GeographicContent,
    GeographicFeature,
    GeographicFocusResolver,
    GeographicHierarchy,
    GeographicLayout,
    resolveGeographicSpatialFocus,
    type GeographicFocusTarget,
} from "../../src/world";

describe("resolveGeographicSpatialFocus", () => {
    it("uses a Region anchor for a direct target", () => {
        const { layout } = fixture();
        expect(
            resolveGeographicSpatialFocus(directTarget("knowledge:region", "region"), layout)
        ).toEqual({
            featureId: "region",
            representationKind: "direct-feature",
            x: 30,
            y: 20,
        });
    });

    it("uses a Site position for a direct target", () => {
        const { layout } = fixture();
        expect(
            resolveGeographicSpatialFocus(directTarget("knowledge:site", "site"), layout)
        ).toMatchObject({ x: 40, y: 25 });
    });

    it("resolves Content through its container Site and preserves content identity", () => {
        const { hierarchy, layout } = fixture();
        const [target] = new GeographicFocusResolver(hierarchy).resolveFocusTargets(
            "knowledge:content"
        );
        if (target === undefined) throw new Error("Expected content focus target.");
        expect(resolveGeographicSpatialFocus(target, layout)).toEqual({
            featureId: "site",
            representationKind: "content-container",
            contentId: "content",
            x: 40,
            y: 25,
        });
    });

    it("keeps multiple representations spatially distinct", () => {
        const first = new GeographicFeature({ id: "first", role: "building" });
        const second = new GeographicFeature({ id: "second", role: "building" });
        const hierarchy = new GeographicHierarchy({ features: [first, second] });
        const layout = new GeographicLayout({
            hierarchy,
            width: 100,
            height: 50,
            placements: [
                { kind: "site", featureId: first.id, position: { x: 10, y: 10 } },
                { kind: "site", featureId: second.id, position: { x: 90, y: 40 } },
            ],
        });
        expect(
            resolveGeographicSpatialFocus(directTarget("knowledge", "first"), layout)
        ).not.toEqual(resolveGeographicSpatialFocus(directTarget("knowledge", "second"), layout));
    });

    it("rejects a target whose feature is absent from the layout", () => {
        const { layout } = fixture();
        expect(() =>
            resolveGeographicSpatialFocus(directTarget("knowledge", "missing"), layout)
        ).toThrow("Unknown spatial focus feature ID: missing");
    });

    it("returns an immutable point without Camera or domain semantics", () => {
        const { layout } = fixture();
        const focus = resolveGeographicSpatialFocus(
            directTarget("knowledge:region", "region"),
            layout
        );
        expect(Object.isFrozen(focus)).toBe(true);
        expect(Object.keys(focus).sort()).toEqual(["featureId", "representationKind", "x", "y"]);
    });
});

function fixture(): Readonly<{ hierarchy: GeographicHierarchy; layout: GeographicLayout }> {
    const region = new GeographicFeature({ id: "region", role: "continent" });
    const site = new GeographicFeature({ id: "site", role: "building", parentId: region.id });
    const hierarchy = new GeographicHierarchy({
        features: [region, site],
        contents: [
            new GeographicContent({
                id: "content",
                knowledgeNodeId: "knowledge:content",
                containerFeatureId: site.id,
            }),
        ],
    });
    const layout = new GeographicLayout({
        hierarchy,
        width: 100,
        height: 50,
        placements: [
            {
                kind: "region",
                featureId: region.id,
                bounds: { x0: 0, y0: 0, x1: 100, y1: 50 },
                anchor: { x: 30, y: 20 },
            },
            { kind: "site", featureId: site.id, position: { x: 40, y: 25 } },
        ],
    });
    return { hierarchy, layout };
}

function directTarget(knowledgeNodeId: string, featureId: string): GeographicFocusTarget {
    return { knowledgeNodeId, featureId, representationKind: "direct-feature" };
}
