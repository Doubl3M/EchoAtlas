import { describe, expect, it } from "vitest";

import type {
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
            "GeographicWorld",
            "WorldConfig",
            "WorldConnection",
            "WorldGenerator",
            "WorldLocation",
            "WorldTerrainMapping",
        ]);
    });

    it("exports only the construction contracts as types", () => {
        const generationVersion: WorldGenerationVersion = "world-v1-exact";
        const contracts: readonly [
            keyof GeographicWorldOptions,
            keyof WorldConfigOptions,
            keyof WorldConnectionOptions,
            keyof WorldLocationOptions,
            keyof TerrainCellIndex,
            keyof WorldCellBounds,
        ] = ["locations", "terrain", "knowledgeRelationId", "knowledgeNodeId", "x", "x0"];

        expect([generationVersion, ...contracts]).toEqual([
            "world-v1-exact",
            "locations",
            "terrain",
            "knowledgeRelationId",
            "knowledgeNodeId",
            "x",
            "x0",
        ]);
    });
});
