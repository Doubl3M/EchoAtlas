import { describe, expect, it } from "vitest";

import { Seed } from "../../src/engine/math";
import {
    GeographicContent,
    GeographicFeature,
    GeographicFocusResolver,
    GeographicHierarchy,
    GeographicLayout,
    GeographicLayoutGenerator,
    GeographicLayoutGeneratorConfig,
    resolveGeographicSpatialFocus,
    type GeographicFeatureOptions,
    type GeographicLayoutGenerationVersion,
    type GeographicPlacement,
    type GeographicRegionPlacement,
    type GeographicRole,
    type GeographicSitePlacement,
} from "../../src/world";

describe("GeographicLayoutGenerator", () => {
    it("generates a valid empty layout", () => {
        const layout = generator().generate(new GeographicHierarchy());
        expect(layout).toBeInstanceOf(GeographicLayout);
        expect(layout.getPlacements()).toEqual([]);
    });

    it("makes a single Region root occupy the complete World envelope", () => {
        const layout = generate([feature("root", "continent")]);
        expect(layout.getRegionPlacementByFeatureId("root")).toEqual({
            kind: "region",
            featureId: "root",
            bounds: { x0: 0, y0: 0, x1: 120, y1: 60 },
            anchor: { x: 60, y: 30 },
        });
    });

    it("partitions several Region roots deterministically without interior overlap", () => {
        const features = [
            feature("root:a", "continent"),
            feature("root:b", "continent"),
            feature("root:c", "continent"),
        ];
        const first = generate(features);
        const second = generate(features);
        expect(signature(second)).toEqual(signature(first));
        expect(first.getPlacements()).toHaveLength(3);
        expectNoRegionInteriorOverlap(first.getPlacements());
    });

    it("allocates greater area to a Region with more Site descendants", () => {
        const features = [
            feature("large", "continent"),
            feature("small", "continent"),
            ...Array.from({ length: 4 }, (_, index) =>
                feature(`large-site:${index}`, "building", "large")
            ),
            feature("small-site", "building", "small"),
        ];
        const layout = generate(features);
        expect(area(regionPlacement(layout, "large"))).toBeGreaterThan(
            area(regionPlacement(layout, "small"))
        );
    });

    it("gives an empty Region positive area", () => {
        const layout = generate([
            feature("empty", "continent"),
            feature("populated", "continent"),
            feature("site", "building", "populated"),
        ]);
        expect(area(regionPlacement(layout, "empty"))).toBeGreaterThan(0);
    });

    it("supports Region to Region to Site containment", () => {
        const layout = generate([
            feature("root", "continent"),
            feature("district", "district", "root"),
            feature("building", "building", "district"),
        ]);
        expect(layout.getRegionPlacementByFeatureId("district")).toBeDefined();
        expect(layout.getSitePlacementByFeatureId("building")).toBeDefined();
    });

    it("supports an additional Region depth without changing the algorithm", () => {
        expect(() =>
            generate([
                feature("root", "continent"),
                feature("level-one", "district", "root"),
                feature("level-two", "district", "level-one"),
                feature("site", "building", "level-two"),
            ])
        ).not.toThrow();
    });

    it("places one Site strictly inside its Region", () => {
        const layout = generate([
            feature("root", "continent"),
            feature("site", "building", "root"),
        ]);
        const root = regionPlacement(layout, "root");
        const site = layout.getSitePlacementByFeatureId("site");
        expect(site?.position.x).toBeGreaterThan(root.bounds.x0);
        expect(site?.position.x).toBeLessThan(root.bounds.x1);
        expect(site?.position.y).toBeGreaterThan(root.bounds.y0);
        expect(site?.position.y).toBeLessThan(root.bounds.y1);
    });

    it("places many Site siblings at distinct deterministic positions", () => {
        const features = [
            feature("root", "continent"),
            ...Array.from({ length: 24 }, (_, index) =>
                feature(`site:${index}`, "building", "root")
            ),
        ];
        const first = generate(features);
        const second = generate([...features].reverse());
        const positions = first
            .getPlacements()
            .filter((placement): placement is GeographicSitePlacement => placement.kind === "site")
            .map(({ position }) => `${position.x}:${position.y}`);
        expect(new Set(positions).size).toBe(24);
        expect(signature(second)).toEqual(signature(first));
    });

    it("supports rectangular World dimensions", () => {
        const layout = generator({ width: 300, height: 40 }).generate(
            new GeographicHierarchy({
                features: [feature("root", "continent"), feature("site", "building", "root")],
            })
        );
        expect(layout.width).toBe(300);
        expect(layout.height).toBe(40);
        expect(layout.getSitePlacementByFeatureId("site")?.position).toEqual({ x: 150, y: 20 });
    });

    it("is exactly reproducible for equal inputs and seed", () => {
        const hierarchy = nonTrivialHierarchy();
        expect(signature(generator({ seed: "same" }).generate(hierarchy))).toEqual(
            signature(generator({ seed: "same" }).generate(hierarchy))
        );
    });

    it("changes spatial ordering for different seeds", () => {
        const hierarchy = nonTrivialHierarchy();
        expect(signature(generator({ seed: "first" }).generate(hierarchy))).not.toEqual(
            signature(generator({ seed: "second" }).generate(hierarchy))
        );
    });

    it("ignores GeographicContent when computing weights and placement", () => {
        const features = [feature("root", "continent"), feature("site", "building", "root")];
        const withoutContents = new GeographicHierarchy({ features });
        const withContents = new GeographicHierarchy({
            features,
            contents: Array.from(
                { length: 20 },
                (_, index) =>
                    new GeographicContent({
                        id: `content:${index}`,
                        knowledgeNodeId: `knowledge:${index}`,
                        containerFeatureId: "site",
                    })
            ),
        });
        expect(signature(generator().generate(withContents))).toEqual(
            signature(generator().generate(withoutContents))
        );
    });

    it("treats multiple features with one Knowledge source as independent geography", () => {
        const hierarchy = new GeographicHierarchy({
            features: [
                feature("root:a", "continent"),
                feature("root:b", "continent"),
                feature("district:a", "district", "root:a", "knowledge:shared"),
                feature("district:b", "district", "root:b", "knowledge:shared"),
            ],
        });
        const layout = generator().generate(hierarchy);
        expect(layout.getPlacementByFeatureId("district:a")).toBeDefined();
        expect(layout.getPlacementByFeatureId("district:b")).toBeDefined();
        expect(layout.getPlacementByFeatureId("district:a")).not.toEqual(
            layout.getPlacementByFeatureId("district:b")
        );
    });

    it("rejects mixed Region and Site children in geographic-layout-v1", () => {
        const hierarchy = new GeographicHierarchy({
            features: [
                feature("root", "continent"),
                feature("region", "district", "root"),
                feature("site", "building", "root"),
            ],
        });
        expect(() => generator().generate(hierarchy)).toThrow(
            "does not support mixed Region and Site children: root"
        );
    });

    it("rejects unsupported roles without a fallback", () => {
        const unsupported = Object.freeze({
            id: "unknown",
            role: "future-role",
            parentId: undefined,
            sourceKnowledgeNodeId: undefined,
        }) as unknown as GeographicFeature;
        const hierarchy = new GeographicHierarchy({ features: [unsupported] });
        expect(() => generator().generate(hierarchy)).toThrow(
            "Unsupported geographic role for geographic-layout-v1: future-role"
        );
    });

    it("rejects unsupported generation versions at runtime", () => {
        expect(
            () =>
                new GeographicLayoutGeneratorConfig({
                    generationVersion: "geographic-layout-v2" as GeographicLayoutGenerationVersion,
                    seed: 1,
                    width: 100,
                    height: 50,
                })
        ).toThrow("Unsupported geographic layout generation version");
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid generator dimension %s",
        (dimension) => {
            expect(
                () =>
                    new GeographicLayoutGeneratorConfig({
                        generationVersion: "geographic-layout-v1",
                        seed: 1,
                        width: dimension,
                        height: 50,
                    })
            ).toThrow("generator width must be finite and positive");
        }
    );

    it("rejects Site roots in geographic-layout-v1", () => {
        expect(() => generate([feature("root", "building")])).toThrow(
            "does not support Site root features"
        );
    });

    it("produces non-overlapping Region siblings", () => {
        const features = [
            feature("root", "continent"),
            ...Array.from({ length: 12 }, (_, index) =>
                feature(`region:${index}`, "district", "root")
            ),
        ];
        expectNoRegionInteriorOverlap(generate(features).getPlacements());
    });

    it("accepts Seed instances without introducing another seed representation", () => {
        const config = new GeographicLayoutGeneratorConfig({
            generationVersion: "geographic-layout-v1",
            seed: new Seed("atlas"),
            width: 100,
            height: 50,
        });
        expect(config.seed.value).toBe(new Seed("atlas").value);
        expect(Object.isFrozen(config)).toBe(true);
        expect(Object.isFrozen(config.seed)).toBe(true);
    });

    it("integrates hierarchy, layout, semantic focus and spatial focus generically", () => {
        const root = feature("root", "continent", undefined, "knowledge:root");
        const region = feature("region", "district", root.id, "knowledge:region");
        const site = feature("site", "building", region.id, "knowledge:site");
        const hierarchy = new GeographicHierarchy({
            features: [root, region, site],
            contents: [
                new GeographicContent({
                    id: "content",
                    knowledgeNodeId: "knowledge:content",
                    containerFeatureId: site.id,
                }),
            ],
        });
        const layout = generator().generate(hierarchy);
        const [target] = new GeographicFocusResolver(hierarchy).resolveFocusTargets(
            "knowledge:content"
        );
        if (target === undefined) throw new Error("Expected a content target.");
        const focus = resolveGeographicSpatialFocus(target, layout);
        expect(focus).toMatchObject({
            featureId: site.id,
            contentId: "content",
            x: layout.getSitePlacementByFeatureId(site.id)?.position.x,
            y: layout.getSitePlacementByFeatureId(site.id)?.position.y,
        });
    });
});

function generator(
    overrides: Partial<{
        seed: string | number;
        width: number;
        height: number;
    }> = {}
): GeographicLayoutGenerator {
    return new GeographicLayoutGenerator(
        new GeographicLayoutGeneratorConfig({
            generationVersion: "geographic-layout-v1",
            seed: overrides.seed ?? "layout-seed",
            width: overrides.width ?? 120,
            height: overrides.height ?? 60,
        })
    );
}

function feature(
    id: string,
    role: GeographicRole,
    parentId?: string,
    sourceKnowledgeNodeId?: string
): GeographicFeature {
    const options: GeographicFeatureOptions = { id, role, parentId, sourceKnowledgeNodeId };
    return new GeographicFeature(options);
}

function generate(features: readonly GeographicFeature[]): GeographicLayout {
    return generator().generate(new GeographicHierarchy({ features }));
}

function nonTrivialHierarchy(): GeographicHierarchy {
    return new GeographicHierarchy({
        features: [
            feature("root:a", "continent"),
            feature("root:b", "continent"),
            feature("root:c", "continent"),
            feature("site:a", "building", "root:a"),
            feature("site:b", "building", "root:b"),
            feature("site:c", "building", "root:c"),
        ],
    });
}

function signature(layout: GeographicLayout): readonly GeographicPlacement[] {
    return layout.getPlacements();
}

function regionPlacement(layout: GeographicLayout, featureId: string): GeographicRegionPlacement {
    const placement = layout.getRegionPlacementByFeatureId(featureId);
    if (placement === undefined) throw new Error(`Missing Region placement: ${featureId}`);
    return placement;
}

function area(placement: GeographicRegionPlacement): number {
    return (
        (placement.bounds.x1 - placement.bounds.x0) * (placement.bounds.y1 - placement.bounds.y0)
    );
}

function expectNoRegionInteriorOverlap(placements: readonly GeographicPlacement[]): void {
    const regions = placements.filter(
        (placement): placement is GeographicRegionPlacement => placement.kind === "region"
    );
    for (let leftIndex = 0; leftIndex < regions.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < regions.length; rightIndex += 1) {
            const left = regions[leftIndex] as GeographicRegionPlacement;
            const right = regions[rightIndex] as GeographicRegionPlacement;
            const overlapWidth =
                Math.min(left.bounds.x1, right.bounds.x1) -
                Math.max(left.bounds.x0, right.bounds.x0);
            const overlapHeight =
                Math.min(left.bounds.y1, right.bounds.y1) -
                Math.max(left.bounds.y0, right.bounds.y0);
            const nested = contains(left, right) || contains(right, left);
            if (!nested) expect(overlapWidth > 0 && overlapHeight > 0).toBe(false);
        }
    }
}

function contains(outer: GeographicRegionPlacement, inner: GeographicRegionPlacement): boolean {
    return (
        inner.bounds.x0 >= outer.bounds.x0 &&
        inner.bounds.y0 >= outer.bounds.y0 &&
        inner.bounds.x1 <= outer.bounds.x1 &&
        inner.bounds.y1 <= outer.bounds.y1
    );
}
