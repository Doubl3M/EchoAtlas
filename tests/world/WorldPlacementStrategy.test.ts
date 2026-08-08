import { describe, expect, it } from "vitest";

import { ExactIndexedPlacementStrategy } from "../../src/world/ExactIndexedPlacementStrategy";
import { resolveWorldPlacementStrategy } from "../../src/world/resolveWorldPlacementStrategy";

describe("World placement strategy resolution", () => {
    it("resolves world-v1-exact to the internal Exact Indexed implementation", () => {
        expect(resolveWorldPlacementStrategy("world-v1-exact")).toBeInstanceOf(
            ExactIndexedPlacementStrategy
        );
    });
});
