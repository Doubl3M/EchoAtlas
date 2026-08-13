import { describe, expect, it } from "vitest";

import type {
    GeographicContentId,
    GeographicContentOptions,
    GeographicFeatureId,
    GeographicFeatureOptions,
    GeographicHierarchyOptions,
    GeographicFocusRepresentationKind,
    GeographicFocusTarget,
    GeographicLayoutOptions,
    GeographicLayoutGenerationVersion,
    GeographicLayoutGeneratorConfigOptions,
    GeographicPlacement,
    GeographicSpatialFocus,
    GeographicRole,
    GeographicWorldOptions,
    WorldConfigOptions,
    WorldConnectionOptions,
    WorldCellBounds,
    WorldLocationOptions,
    WorldGenerationVersion,
    TerrainCellIndex,
} from "../../src/world";

describe("world public API", () => {
    it("exports only the intended runtime symbols", async () => {
        const publicApi = await import("../../src/world");

        expect(Object.keys(publicApi).sort()).toEqual([
            "GeographicContent",
            "GeographicFeature",
            "GeographicFocusResolver",
            "GeographicHierarchy",
            "GeographicLayout",
            "GeographicLayoutGenerator",
            "GeographicLayoutGeneratorConfig",
            "GeographicWorld",
            "WorldConfig",
            "WorldConnection",
            "WorldGenerator",
            "WorldLocation",
            "WorldTerrainMapping",
            "resolveGeographicSpatialFocus",
        ]);
    });

    it("exports only the construction contracts as types", () => {
        const featureId: GeographicFeatureId = "feature";
        const contentId: GeographicContentId = "content";
        const role: GeographicRole = "continent";
        const generationVersion: WorldGenerationVersion = "world-v1-exact";
        const contracts: readonly [
            keyof GeographicWorldOptions,
            keyof WorldConfigOptions,
            keyof WorldConnectionOptions,
            keyof WorldLocationOptions,
            keyof TerrainCellIndex,
            keyof WorldCellBounds,
        ] = ["locations", "terrain", "knowledgeRelationId", "knowledgeNodeId", "x", "x0"];
        const hierarchyContracts: readonly [
            keyof GeographicFeatureOptions,
            keyof GeographicContentOptions,
            keyof GeographicHierarchyOptions,
        ] = ["role", "containerFeatureId", "features"];
        const focusKind: GeographicFocusRepresentationKind = "content-container";
        const focusTarget: GeographicFocusTarget = {
            knowledgeNodeId: "node",
            featureId,
            representationKind: focusKind,
        };
        const placement: GeographicPlacement = {
            kind: "site",
            featureId,
            position: { x: 1, y: 2 },
        };
        const layoutKey: keyof GeographicLayoutOptions = "hierarchy";
        const spatialFocusKey: keyof GeographicSpatialFocus = "featureId";
        const layoutGenerationVersion: GeographicLayoutGenerationVersion = "geographic-layout-v1";
        const generatorConfigKey: keyof GeographicLayoutGeneratorConfigOptions = "seed";

        expect([
            featureId,
            contentId,
            role,
            generationVersion,
            ...contracts,
            ...hierarchyContracts,
            focusTarget.representationKind,
            placement.kind,
            layoutKey,
            spatialFocusKey,
            layoutGenerationVersion,
            generatorConfigKey,
        ]).toEqual([
            "feature",
            "content",
            "continent",
            "world-v1-exact",
            "locations",
            "terrain",
            "knowledgeRelationId",
            "knowledgeNodeId",
            "x",
            "x0",
            "role",
            "containerFeatureId",
            "features",
            "content-container",
            "site",
            "hierarchy",
            "featureId",
            "geographic-layout-v1",
            "seed",
        ]);
    });
});
