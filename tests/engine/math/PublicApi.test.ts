import { describe, expect, it } from "vitest";

describe("math public API", () => {
    it("exports only the intended runtime symbols", async () => {
        const publicApi = await import("../../../src/engine/math");

        expect(Object.keys(publicApi).sort()).toEqual([
            "DeterministicRandom",
            "Seed",
            "ValueNoise2D",
            "clamp",
            "hashCoordinate2D",
            "hashString",
            "hashToFloat",
            "inverseLerp",
            "lerp",
            "mixUint32",
            "smootherstep",
            "smoothstep",
        ]);
    });
});
