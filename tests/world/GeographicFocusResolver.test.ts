import { describe, expect, it } from "vitest";

import {
    GeographicContent,
    GeographicFeature,
    GeographicFocusResolver,
    GeographicHierarchy,
    type GeographicFocusTarget,
    type GeographicRole,
} from "../../src/world";

describe("GeographicFocusResolver", () => {
    it("returns no target for a Knowledge identity without geography", () => {
        const targets = new GeographicFocusResolver(new GeographicHierarchy()).resolveFocusTargets(
            "knowledge:none"
        );
        expect(targets).toEqual([]);
        expect(Object.isFrozen(targets)).toBe(true);
    });

    it.each([
        ["root", "continent"],
        ["district", "district"],
        ["building", "building"],
    ] as const)("resolves a direct %s feature without knowing its domain meaning", (id, role) => {
        const hierarchy = hierarchyOf([feature(id, role, undefined, `knowledge:${id}`)]);
        expect(
            new GeographicFocusResolver(hierarchy).resolveFocusTargets(`knowledge:${id}`)
        ).toEqual([
            {
                knowledgeNodeId: `knowledge:${id}`,
                featureId: id,
                representationKind: "direct-feature",
            },
        ]);
    });

    it("resolves content to its container while preserving content identity", () => {
        const building = feature("building");
        const hierarchy = hierarchyOf(
            [building],
            [content("content:track", "knowledge:track", building.id)]
        );
        const [target] = new GeographicFocusResolver(hierarchy).resolveFocusTargets(
            "knowledge:track"
        );
        expect(target).toEqual({
            knowledgeNodeId: "knowledge:track",
            featureId: "building",
            representationKind: "content-container",
            contentId: "content:track",
        });
        expect(Object.isFrozen(target)).toBe(true);
    });

    it("returns all direct and content representations in canonical order", () => {
        const hierarchy = hierarchyOf(
            [
                feature("district:z", "district", undefined, "knowledge:shared"),
                feature("building:b"),
                feature("district:a", "district", undefined, "knowledge:shared"),
                feature("building:a"),
            ],
            [
                content("content:z", "knowledge:shared", "building:b"),
                content("content:a", "knowledge:shared", "building:a"),
            ]
        );
        expect(
            new GeographicFocusResolver(hierarchy)
                .resolveFocusTargets("knowledge:shared")
                .map(({ featureId, representationKind, contentId }) => [
                    featureId,
                    representationKind,
                    contentId,
                ])
        ).toEqual([
            ["building:a", "content-container", "content:a"],
            ["building:b", "content-container", "content:z"],
            ["district:a", "direct-feature", undefined],
            ["district:z", "direct-feature", undefined],
        ]);
    });

    it("is independent from hierarchy insertion order", () => {
        const features = branchFeatures();
        const contents = [
            content("content:b", "knowledge:track", "building:b"),
            content("content:a", "knowledge:track", "building:a"),
        ];
        const forward = new GeographicFocusResolver(hierarchyOf(features, contents));
        const reverse = new GeographicFocusResolver(
            hierarchyOf([...features].reverse(), [...contents].reverse())
        );
        expect(reverse.resolveFocusTargets("knowledge:album")).toEqual(
            forward.resolveFocusTargets("knowledge:album")
        );
        expect(reverse.resolveFocusTargets("knowledge:track")).toEqual(
            forward.resolveFocusTargets("knowledge:track")
        );
    });

    it("uses canonical order as a deterministic context-free fallback", () => {
        const resolver = new GeographicFocusResolver(hierarchyOf(branchFeatures()));
        const targets = resolver.resolveFocusTargets("knowledge:album");
        expect(resolver.chooseFocusTarget(targets)?.featureId).toBe("building:a");
        expect(resolver.chooseFocusTarget([])).toBeUndefined();
    });

    it("prefers an exact candidate matching the context", () => {
        const resolver = new GeographicFocusResolver(hierarchyOf(branchFeatures()));
        const targets = resolver.resolveFocusTargets("knowledge:album");
        expect(resolver.chooseFocusTarget(targets, "building:b")?.featureId).toBe("building:b");
    });

    it("prefers a descendant in the current parent branch", () => {
        const resolver = new GeographicFocusResolver(hierarchyOf(branchFeatures()));
        const targets = resolver.resolveFocusTargets("knowledge:album");
        expect(resolver.chooseFocusTarget(targets, "district:b")?.featureId).toBe("building:b");
    });

    it("prefers an ancestor in the current descendant branch", () => {
        const resolver = new GeographicFocusResolver(hierarchyOf(branchFeatures()));
        const targets = resolver.resolveFocusTargets("knowledge:artist");
        expect(resolver.chooseFocusTarget(targets, "building:b")?.featureId).toBe("district:b");
    });

    it("chooses a content container in the same branch", () => {
        const features = branchFeatures();
        const hierarchy = hierarchyOf(features, [
            content("content:a", "knowledge:track", "building:a"),
            content("content:b", "knowledge:track", "building:b"),
        ]);
        const resolver = new GeographicFocusResolver(hierarchy);
        const targets = resolver.resolveFocusTargets("knowledge:track");
        expect(resolver.chooseFocusTarget(targets, "district:b")).toMatchObject({
            featureId: "building:b",
            contentId: "content:b",
            representationKind: "content-container",
        });
    });

    it("uses deepest common ancestry, then total distance, then canonical ID", () => {
        const features = [
            feature("root", "continent"),
            feature("branch", "district", "root"),
            feature("context", "building", "branch"),
            feature("near", "building", "branch", "knowledge:destination"),
            feature("far-parent", "district", "root"),
            feature("far", "building", "far-parent", "knowledge:destination"),
        ];
        const resolver = new GeographicFocusResolver(hierarchyOf(features));
        expect(
            resolver.chooseFocusTarget(
                resolver.resolveFocusTargets("knowledge:destination"),
                "context"
            )?.featureId
        ).toBe("near");
    });

    it("uses lexical identity as the final tie-break", () => {
        const hierarchy = hierarchyOf([
            feature("root", "continent"),
            feature("context", "district", "root"),
            feature("candidate:z", "district", "root", "knowledge:destination"),
            feature("candidate:a", "district", "root", "knowledge:destination"),
        ]);
        const resolver = new GeographicFocusResolver(hierarchy);
        expect(
            resolver.chooseFocusTarget(
                resolver.resolveFocusTargets("knowledge:destination"),
                "context"
            )?.featureId
        ).toBe("candidate:a");
    });

    it("totally orders distinct targets ending at the same feature", () => {
        const resolver = new GeographicFocusResolver(hierarchyOf([feature("shared")]));
        const targets: readonly GeographicFocusTarget[] = [
            {
                knowledgeNodeId: "knowledge:target",
                featureId: "shared",
                representationKind: "direct-feature",
            },
            {
                knowledgeNodeId: "knowledge:target",
                featureId: "shared",
                representationKind: "content-container",
                contentId: "content:z",
            },
            {
                knowledgeNodeId: "knowledge:target",
                featureId: "shared",
                representationKind: "content-container",
                contentId: "content:a",
            },
        ];

        expect(resolver.chooseFocusTarget(targets, "shared")).toEqual(
            resolver.chooseFocusTarget([...targets].reverse(), "shared")
        );
        expect(resolver.chooseFocusTarget(targets, "shared")).toMatchObject({
            representationKind: "content-container",
            contentId: "content:a",
        });
    });

    it("rejects an unknown context even when no candidates exist", () => {
        const resolver = new GeographicFocusResolver(hierarchyOf([feature("known")]));
        expect(() => resolver.chooseFocusTarget([], "missing")).toThrow(
            "Unknown geographic context feature ID: missing"
        );
    });

    it("rejects targets referring to a foreign hierarchy", () => {
        const resolver = new GeographicFocusResolver(hierarchyOf([feature("known")]));
        const target: GeographicFocusTarget = {
            knowledgeNodeId: "knowledge",
            featureId: "missing",
            representationKind: "direct-feature",
        };
        expect(() => resolver.chooseFocusTarget([target])).toThrow(
            "Unknown geographic focus target feature ID: missing"
        );
    });

    it("supports an additional containment depth without role-specific logic", () => {
        const hierarchy = hierarchyOf([
            feature("root", "continent"),
            feature("extra-level:a", "district", "root"),
            feature("extra-level:b", "district", "root"),
            feature("nested:a", "district", "extra-level:a"),
            feature("nested:b", "district", "extra-level:b"),
            feature("destination:a", "building", "nested:a", "knowledge:destination"),
            feature("destination:b", "building", "nested:b", "knowledge:destination"),
        ]);
        const resolver = new GeographicFocusResolver(hierarchy);
        expect(
            resolver.chooseFocusTarget(
                resolver.resolveFocusTargets("knowledge:destination"),
                "nested:b"
            )?.featureId
        ).toBe("destination:b");
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

function content(id: string, knowledgeNodeId: string, containerFeatureId: string) {
    return new GeographicContent({ id, knowledgeNodeId, containerFeatureId });
}

function hierarchyOf(
    features: readonly GeographicFeature[],
    contents: readonly GeographicContent[] = []
): GeographicHierarchy {
    return new GeographicHierarchy({ features, contents });
}

function branchFeatures(): readonly GeographicFeature[] {
    return [
        feature("continent:a", "continent"),
        feature("district:a", "district", "continent:a", "knowledge:artist"),
        feature("building:a", "building", "district:a", "knowledge:album"),
        feature("continent:b", "continent"),
        feature("district:b", "district", "continent:b", "knowledge:artist"),
        feature("building:b", "building", "district:b", "knowledge:album"),
    ];
}
