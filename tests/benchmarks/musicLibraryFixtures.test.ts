import { describe, expect, it } from "vitest";

import {
    benchmarkDatasetDefinitions,
    createBenchmarkDataset,
    placementDatasetDefinitions,
    terrainDatasetDefinitions,
} from "../../benchmarks/musicLibraryFixtures";
import { projectTier, type MeasuredWorldScalingTier } from "../../benchmarks/WorldScalingBenchmark";
import {
    defaultWorldScalingDefinitions,
    targetWorldScalingDefinitions,
    worldScalingWorkloads,
} from "../../benchmarks/worldScalingWorkloads";

describe("benchmark music library fixtures", () => {
    it("reproduces the same document and configuration", () => {
        const definition = benchmarkDatasetDefinitions[0];
        const first = createBenchmarkDataset(definition);
        const second = createBenchmarkDataset(definition);

        expect(JSON.stringify(first.document)).toBe(JSON.stringify(second.document));
        expect(first.worldConfig).toEqual(second.worldConfig);
    });

    it.each(benchmarkDatasetDefinitions)(
        "creates the declared $name entity and relation counts",
        (definition) => {
            const dataset = createBenchmarkDataset(definition);
            const entityCount =
                dataset.document.artists.length +
                dataset.document.albums.length +
                dataset.document.tracks.length +
                dataset.document.labels.length +
                dataset.document.playlists.length;

            expect(entityCount).toBe(definition.entityCount);
            expect(dataset.document.relations).toHaveLength(definition.relationCount);
            expect(dataset.document.metadata.seed).toBe(2_011_091);
        }
    );

    it("keeps generated collections immutable", () => {
        const dataset = createBenchmarkDataset(benchmarkDatasetDefinitions[0]);

        expect(Object.isFrozen(dataset.document)).toBe(true);
        expect(Object.isFrozen(dataset.document.artists)).toBe(true);
        expect(Object.isFrozen(dataset.document.relations)).toBe(true);
        expect(Object.isFrozen(dataset.document.relations[0])).toBe(true);
        expect(Object.isFrozen(dataset.document.relations[0].source)).toBe(true);
    });

    it("varies only graph size in the placement series", () => {
        expect(placementDatasetDefinitions.map(({ entityCount }) => entityCount)).toEqual([
            40, 160, 480, 1_000,
        ]);
        expect(new Set(placementDatasetDefinitions.map(({ worldWidth }) => worldWidth))).toEqual(
            new Set([64])
        );
        expect(new Set(placementDatasetDefinitions.map(({ worldHeight }) => worldHeight))).toEqual(
            new Set([48])
        );
        expect(
            placementDatasetDefinitions.every(
                ({ entityCount, relationCount }) => relationCount === entityCount * 1.5
            )
        ).toBe(true);
    });

    it("varies only terrain dimensions in the terrain series", () => {
        expect(
            terrainDatasetDefinitions.map(({ worldWidth, worldHeight }) => [
                worldWidth,
                worldHeight,
            ])
        ).toEqual([
            [64, 48],
            [128, 96],
            [256, 192],
            [512, 384],
        ]);
        expect(new Set(terrainDatasetDefinitions.map(({ entityCount }) => entityCount))).toEqual(
            new Set([40])
        );
        expect(
            new Set(terrainDatasetDefinitions.map(({ relationCount }) => relationCount))
        ).toEqual(new Set([60]));
    });

    it("defines the non-normative Phase 11 workload references", () => {
        expect(worldScalingWorkloads).toEqual([
            { name: "Representative", nodeCount: 1_000 },
            { name: "Heavy", nodeCount: 5_000 },
            { name: "Stress", nodeCount: 10_000 },
        ]);
        expect(defaultWorldScalingDefinitions.map(({ entityCount }) => entityCount)).toEqual([
            250, 500, 1_000, 2_000,
        ]);
        expect(targetWorldScalingDefinitions.map(({ entityCount }) => entityCount)).toEqual([
            5_000, 10_000,
        ]);
        expect(
            [...defaultWorldScalingDefinitions, ...targetWorldScalingDefinitions].every(
                ({ entityCount, relationCount, worldWidth, worldHeight, placementIterations }) =>
                    relationCount === entityCount * 1.5 &&
                    worldWidth === 64 &&
                    worldHeight === 48 &&
                    placementIterations === 8
            )
        ).toBe(true);
    });

    it("projects target workloads from the two largest measured coefficients", () => {
        const measured = [measuredTier(1_000, 400), measuredTier(2_000, 1_600)];

        const heavy = projectTier(targetWorldScalingDefinitions[0], measured);
        const stress = projectTier(targetWorldScalingDefinitions[1], measured);

        expect(heavy).toMatchObject({
            status: "PROJECTED",
            execution: "NOT RUN",
            workload: "Heavy",
            projectedMedian: 10_000,
            projectedCampaign: 40_000,
        });
        expect(stress).toMatchObject({
            status: "PROJECTED",
            execution: "NOT RUN",
            workload: "Stress",
            projectedMedian: 40_000,
            projectedCampaign: 160_000,
        });
    });
});

function measuredTier(nodes: number, median: number): MeasuredWorldScalingTier {
    return {
        status: "MEASURED",
        workload: undefined,
        nodes,
        relations: nodes * 1.5,
        timing: { median, minimum: median, maximum: median },
        millisecondsPerNodeSquared: median / nodes ** 2,
        growthFactor: undefined,
    };
}
