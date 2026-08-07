import { describe, expect, it } from "vitest";

describe("terrain public API", () => {
    it("exports only the intended runtime symbols", async () => {
        const publicApi = await import("../../../src/engine/terrain");

        expect(Object.keys(publicApi).sort()).toEqual([
            "HeightField",
            "TerrainConfig",
            "TerrainGenerator",
        ]);
    });
});
