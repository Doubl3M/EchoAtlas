import type { BenchmarkDatasetDefinition } from "./musicLibraryFixtures";

const FIXED_TERRAIN_WIDTH = 64;
const FIXED_TERRAIN_HEIGHT = 48;
const PLACEMENT_ITERATIONS = 8;

export interface WorldScalingWorkload {
    readonly name: "Representative" | "Heavy" | "Stress";
    /** Approximate development reference, not a product limit or performance budget. */
    readonly nodeCount: number;
}

export const worldScalingWorkloads: readonly WorldScalingWorkload[] = Object.freeze([
    Object.freeze({ name: "Representative", nodeCount: 1_000 }),
    Object.freeze({ name: "Heavy", nodeCount: 5_000 }),
    Object.freeze({ name: "Stress", nodeCount: 10_000 }),
]);

export const defaultWorldScalingDefinitions: readonly BenchmarkDatasetDefinition[] = Object.freeze(
    [250, 500, 1_000, 2_000].map(createWorldScalingDefinition)
);

export const targetWorldScalingDefinitions: readonly BenchmarkDatasetDefinition[] = Object.freeze(
    worldScalingWorkloads
        .filter(({ nodeCount }) => nodeCount > 2_000)
        .map(({ nodeCount }) => createWorldScalingDefinition(nodeCount))
);

function createWorldScalingDefinition(nodeCount: number): BenchmarkDatasetDefinition {
    return Object.freeze({
        name: `world-scaling-${nodeCount}`,
        entityCount: nodeCount,
        relationCount: Math.round(nodeCount * 1.5),
        worldWidth: FIXED_TERRAIN_WIDTH,
        worldHeight: FIXED_TERRAIN_HEIGHT,
        placementIterations: PLACEMENT_ITERATIONS,
    });
}
