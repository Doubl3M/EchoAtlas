import { describe, expect, it } from "vitest";

import { GeographicContent, GeographicFeature, GeographicHierarchy } from "../../src/world";

function feature(
    id: string,
    role: "continent" | "district" | "building" = "building",
    parentId?: string,
    sourceKnowledgeNodeId?: string
): GeographicFeature {
    return new GeographicFeature({ id, role, parentId, sourceKnowledgeNodeId });
}

function content(id: string, knowledgeNodeId: string, containerFeatureId: string) {
    return new GeographicContent({ id, knowledgeNodeId, containerFeatureId });
}

describe("GeographicHierarchy", () => {
    it("supports only the three resolved geographic roles", () => {
        expect(feature("continent", "continent").role).toBe("continent");
        expect(feature("district", "district").role).toBe("district");
        expect(feature("building", "building").role).toBe("building");
        expect(
            () =>
                new GeographicFeature({
                    id: "city",
                    role: "city" as "district",
                })
        ).toThrow("Unsupported geographic role: city");
    });

    it("represents an immutable empty hierarchy", () => {
        const hierarchy = new GeographicHierarchy();

        expect(hierarchy.getFeatures()).toEqual([]);
        expect(hierarchy.getContents()).toEqual([]);
        expect(Object.isFrozen(hierarchy)).toBe(true);
        expect(Object.isFrozen(hierarchy.getFeatures())).toBe(true);
        expect(Object.isFrozen(hierarchy.getContents())).toBe(true);
    });

    it("supports a root feature, parent navigation and depth greater than two", () => {
        const continent = feature("continent:ambient", "continent", undefined, "node:genre");
        const district = feature("district:eno", "district", continent.id, "node:artist");
        const building = feature("building:apollo", "building", district.id, "node:album");
        const annex = feature("building:annex", "building", building.id);
        const hierarchy = new GeographicHierarchy({
            features: [annex, building, continent, district],
        });

        expect(hierarchy.getFeatures().map(({ id }) => id)).toEqual([
            "building:annex",
            "building:apollo",
            "continent:ambient",
            "district:eno",
        ]);
        expect(hierarchy.getFeatureById(continent.id)).toBe(continent);
        expect(hierarchy.getParent(continent.id)).toBeUndefined();
        expect(hierarchy.getParent(building.id)).toBe(district);
        expect(hierarchy.getParent(annex.id)).toBe(building);
        expect(hierarchy.getChildren(continent.id)).toEqual([district]);
        expect(hierarchy.getChildren(district.id)).toEqual([building]);
    });

    it("rejects duplicate feature IDs, unknown parents and self-parenting", () => {
        expect(
            () => new GeographicHierarchy({ features: [feature("same"), feature("same")] })
        ).toThrow("Duplicate geographic feature ID: same");
        expect(
            () =>
                new GeographicHierarchy({
                    features: [feature("orphan", "district", "missing")],
                })
        ).toThrow("Unknown parent geographic feature ID: missing");
        expect(
            () =>
                new GeographicHierarchy({
                    features: [feature("self", "district", "self")],
                })
        ).toThrow("cannot contain itself");
    });

    it("rejects direct and indirect containment cycles", () => {
        expect(
            () =>
                new GeographicHierarchy({
                    features: [feature("A", "district", "B"), feature("B", "district", "A")],
                })
        ).toThrow("containment cycle");
        expect(
            () =>
                new GeographicHierarchy({
                    features: [
                        feature("A", "district", "B"),
                        feature("B", "district", "C"),
                        feature("C", "district", "A"),
                    ],
                })
        ).toThrow("containment cycle");
    });

    it("stores multiple canonical contents and resolves their container", () => {
        const building = feature("building:low");
        const first = content("content:sound", "node:sound", building.id);
        const second = content("content:war", "node:war", building.id);
        const hierarchy = new GeographicHierarchy({
            features: [building],
            contents: [second, first],
        });

        expect(hierarchy.getContents()).toEqual([first, second]);
        expect(hierarchy.getContentById(first.id)).toBe(first);
        expect(hierarchy.getContentsByContainerId(building.id)).toEqual([first, second]);
        expect(hierarchy.getContainerForContent(second.id)).toBe(building);
    });

    it("rejects unknown containers, duplicate content IDs and duplicate mappings", () => {
        const building = feature("building:low");
        expect(
            () =>
                new GeographicHierarchy({
                    contents: [content("content:sound", "node:sound", "missing")],
                })
        ).toThrow("Unknown content container feature ID: missing");
        expect(
            () =>
                new GeographicHierarchy({
                    features: [building],
                    contents: [
                        content("same", "node:sound", building.id),
                        content("same", "node:war", building.id),
                    ],
                })
        ).toThrow("Duplicate geographic content ID: same");
        expect(
            () =>
                new GeographicHierarchy({
                    features: [building],
                    contents: [
                        content("first", "node:sound", building.id),
                        content("second", "node:sound", building.id),
                    ],
                })
        ).toThrow("Duplicate geographic content mapping");
    });

    it("allows one Knowledge Node to source multiple geographic features", () => {
        const first = feature("district:artist:ambient", "district", undefined, "node:artist");
        const second = feature("district:artist:rock", "district", undefined, "node:artist");
        const hierarchy = new GeographicHierarchy({ features: [second, first] });

        expect(hierarchy.getFeaturesByKnowledgeNodeId("node:artist")).toEqual([first, second]);
    });

    it("is independent of equivalent input permutations", () => {
        const features = [
            feature("continent", "continent", undefined, "node:genre"),
            feature("district", "district", "continent", "node:artist"),
            feature("building", "building", "district", "node:album"),
        ];
        const contents = [
            content("track:b", "node:track-b", "building"),
            content("track:a", "node:track-a", "building"),
        ];
        const forward = new GeographicHierarchy({ features, contents });
        const reverse = new GeographicHierarchy({
            features: [...features].reverse(),
            contents: [...contents].reverse(),
        });

        expect(reverse.getFeatures()).toEqual(forward.getFeatures());
        expect(reverse.getContents()).toEqual(forward.getContents());
        expect(reverse.getChildren("continent")).toEqual(forward.getChildren("continent"));
        expect(reverse.getContentsByContainerId("building")).toEqual(
            forward.getContentsByContainerId("building")
        );
    });

    it("defensively copies inputs and never exposes mutable collections", () => {
        const root = feature("root", "continent");
        const child = feature("child", "district", root.id);
        const item = content("content", "node:track", child.id);
        const features = [root, child];
        const contents = [item];
        const hierarchy = new GeographicHierarchy({ features, contents });

        features.length = 0;
        contents.length = 0;
        expect(hierarchy.getFeatures()).toEqual([child, root]);
        expect(hierarchy.getContents()).toEqual([item]);
        expect(Object.isFrozen(hierarchy.getFeaturesByKnowledgeNodeId("missing"))).toBe(true);
        expect(Object.isFrozen(hierarchy.getChildren(root.id))).toBe(true);
        expect(Object.isFrozen(hierarchy.getContentsByContainerId(child.id))).toBe(true);
        expect(Object.isFrozen(root)).toBe(true);
        expect(Object.isFrozen(item)).toBe(true);
    });
});
