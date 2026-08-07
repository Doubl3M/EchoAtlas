import { describe, expect, it } from "vitest";

import type {
    GeographicWorldOptions,
    WorldConfigOptions,
    WorldConnectionOptions,
    WorldLocationOptions,
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
        ]);
    });

    it("exports only the construction contracts as types", () => {
        const contracts: readonly [
            keyof GeographicWorldOptions,
            keyof WorldConfigOptions,
            keyof WorldConnectionOptions,
            keyof WorldLocationOptions,
        ] = ["locations", "terrain", "knowledgeRelationId", "knowledgeNodeId"];

        expect(contracts).toEqual([
            "locations",
            "terrain",
            "knowledgeRelationId",
            "knowledgeNodeId",
        ]);
    });
});
