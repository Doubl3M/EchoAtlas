import { describe, expect, it } from "vitest";

import {
    benchmarkDatasetDefinitions,
    createBenchmarkDataset,
    placementDatasetDefinitions,
    terrainDatasetDefinitions,
} from "../../benchmarks/musicLibraryFixtures";

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
});
