import { describe, expect, it } from "vitest";

import { createBenchmarkDataset } from "../../benchmarks/musicLibraryFixtures";
import { hashString, type SeedInput } from "../../src/engine/math";
import { MusicInterpreter } from "../../src/music";
import { MusicJsonImporter } from "../../src/music/import";
import { WorldGenerator } from "../../src/world";

interface PlacementReference {
    readonly nodes: number;
    readonly seed: SeedInput;
    readonly signature: number;
}

const references: readonly PlacementReference[] = Object.freeze([
    { nodes: 40, seed: 2_011_091, signature: 2_504_596_873 },
    { nodes: 40, seed: -7, signature: 2_056_782_367 },
    { nodes: 40, seed: "indexed-parity", signature: 749_798_160 },
    { nodes: 160, seed: 2_011_091, signature: 1_695_949_065 },
    { nodes: 160, seed: -7, signature: 2_995_446_211 },
    { nodes: 160, seed: "indexed-parity", signature: 565_322_513 },
    { nodes: 1_000, seed: 2_011_091, signature: 2_358_514_515 },
    { nodes: 1_000, seed: -7, signature: 2_797_686_925 },
    { nodes: 1_000, seed: "indexed-parity", signature: 1_065_400_173 },
]);

describe("indexed World placement regression", () => {
    it.each(references)(
        "preserves the exact $nodes-node layout for seed $seed",
        ({ nodes, seed, signature }) => {
            const dataset = createBenchmarkDataset({
                name: `indexed-regression-${nodes}`,
                entityCount: nodes,
                relationCount: Math.round(nodes * 1.5),
                worldWidth: 64,
                worldHeight: 48,
                placementIterations: 8,
            });
            const imported = new MusicJsonImporter().import(dataset.document);
            const graph = new MusicInterpreter().interpret(imported.catalog);
            const locations = new WorldGenerator()
                .generate(seed, dataset.worldConfig, graph)
                .getLocations();
            const serialized = locations
                .map(({ knowledgeNodeId, x, y }) => `${knowledgeNodeId}:${x}:${y}`)
                .join("|");

            expect(hashString(serialized)).toBe(signature);
        }
    );
});
