import { TerrainConfig } from "../src/engine/terrain";
import { WorldConfig } from "../src/world";

export interface BenchmarkDatasetDefinition {
    readonly name: string;
    readonly entityCount: number;
    readonly relationCount: number;
    readonly worldWidth: number;
    readonly worldHeight: number;
    readonly placementIterations: number;
}

export interface BenchmarkMusicDocument {
    readonly metadata: {
        readonly version: "1.0";
        readonly title: string;
        readonly seed: number;
    };
    readonly artists: readonly BenchmarkNamedEntity[];
    readonly albums: readonly BenchmarkTitledEntity[];
    readonly tracks: readonly BenchmarkTitledEntity[];
    readonly labels: readonly BenchmarkNamedEntity[];
    readonly playlists: readonly BenchmarkNamedEntity[];
    readonly relations: readonly BenchmarkRelation[];
}

interface BenchmarkNamedEntity {
    readonly id: string;
    readonly name: string;
}

interface BenchmarkTitledEntity {
    readonly id: string;
    readonly title: string;
}

interface BenchmarkEndpoint {
    readonly kind: "artist" | "album" | "track" | "label" | "playlist";
    readonly id: string;
}

interface BenchmarkRelation {
    readonly id: string;
    readonly kind: string;
    readonly source: BenchmarkEndpoint;
    readonly target: BenchmarkEndpoint;
    readonly weight: number;
}

export interface BenchmarkDataset {
    readonly definition: BenchmarkDatasetDefinition;
    readonly document: BenchmarkMusicDocument;
    readonly worldConfig: WorldConfig;
}

export const benchmarkDatasetDefinitions: readonly BenchmarkDatasetDefinition[] = Object.freeze([
    Object.freeze({
        name: "small",
        entityCount: 40,
        relationCount: 60,
        worldWidth: 64,
        worldHeight: 48,
        placementIterations: 8,
    }),
    Object.freeze({
        name: "medium",
        entityCount: 160,
        relationCount: 240,
        worldWidth: 128,
        worldHeight: 96,
        placementIterations: 8,
    }),
    Object.freeze({
        name: "large",
        entityCount: 480,
        relationCount: 720,
        worldWidth: 256,
        worldHeight: 192,
        placementIterations: 8,
    }),
]);

/** Diagnostic series: only graph size changes; terrain and placement settings remain fixed. */
export const placementDatasetDefinitions: readonly BenchmarkDatasetDefinition[] = Object.freeze(
    [40, 160, 480, 1_000].map((entityCount) =>
        Object.freeze({
            name: `placement-${entityCount}`,
            entityCount,
            relationCount: Math.round(entityCount * 1.5),
            worldWidth: 64,
            worldHeight: 48,
            placementIterations: 8,
        })
    )
);

/** Diagnostic series: only terrain dimensions change; graph and placement settings remain fixed. */
export const terrainDatasetDefinitions: readonly BenchmarkDatasetDefinition[] = Object.freeze(
    [
        [64, 48],
        [128, 96],
        [256, 192],
        [512, 384],
    ].map(([worldWidth, worldHeight]) =>
        Object.freeze({
            name: `terrain-${worldWidth}x${worldHeight}`,
            entityCount: 40,
            relationCount: 60,
            worldWidth,
            worldHeight,
            placementIterations: 8,
        })
    )
);

export function createBenchmarkDataset(definition: BenchmarkDatasetDefinition): BenchmarkDataset {
    validateDefinition(definition);
    const collections = createCollections(definition.entityCount);
    const document: BenchmarkMusicDocument = Object.freeze({
        metadata: Object.freeze({
            version: "1.0",
            title: `EchoAtlas ${definition.name} benchmark`,
            seed: 2_011_091,
        }),
        artists: Object.freeze(collections.artists),
        albums: Object.freeze(collections.albums),
        tracks: Object.freeze(collections.tracks),
        labels: Object.freeze(collections.labels),
        playlists: Object.freeze(collections.playlists),
        relations: Object.freeze(createRelations(collections.endpoints, definition.relationCount)),
    });
    const terrain = new TerrainConfig({
        width: definition.worldWidth,
        height: definition.worldHeight,
        baseFrequency: 0.035,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2,
        offsetX: -23,
        offsetY: 17,
    });
    const worldConfig = new WorldConfig({
        width: definition.worldWidth,
        height: definition.worldHeight,
        placementIterations: definition.placementIterations,
        attractionStrength: 0.012,
        repulsionStrength: 0.8,
        terrain,
    });

    return Object.freeze({ definition, document, worldConfig });
}

interface MutableCollections {
    readonly artists: BenchmarkNamedEntity[];
    readonly albums: BenchmarkTitledEntity[];
    readonly tracks: BenchmarkTitledEntity[];
    readonly labels: BenchmarkNamedEntity[];
    readonly playlists: BenchmarkNamedEntity[];
    readonly endpoints: BenchmarkEndpoint[];
}

function createCollections(entityCount: number): MutableCollections {
    const collections: MutableCollections = {
        artists: [],
        albums: [],
        tracks: [],
        labels: [],
        playlists: [],
        endpoints: [],
    };
    const kinds: readonly BenchmarkEndpoint["kind"][] = [
        "artist",
        "album",
        "track",
        "track",
        "album",
        "artist",
        "track",
        "label",
        "playlist",
        "track",
    ];

    for (let index = 0; index < entityCount; index += 1) {
        const kind = kinds[index % kinds.length];
        const id = `${kind}-${String(index).padStart(5, "0")}`;
        collections.endpoints.push(Object.freeze({ kind, id }));
        if (kind === "album" || kind === "track") {
            collections[kind === "album" ? "albums" : "tracks"].push(
                Object.freeze({ id, title: `Benchmark ${kind} ${index}` })
            );
        } else {
            const collection =
                kind === "artist"
                    ? collections.artists
                    : kind === "label"
                      ? collections.labels
                      : collections.playlists;
            collection.push(Object.freeze({ id, name: `Benchmark ${kind} ${index}` }));
        }
    }
    return collections;
}

function createRelations(
    endpoints: readonly BenchmarkEndpoint[],
    relationCount: number
): BenchmarkRelation[] {
    const relations: BenchmarkRelation[] = [];
    for (let index = 0; index < relationCount; index += 1) {
        relations.push(
            Object.freeze({
                id: `relation-${String(index).padStart(6, "0")}`,
                kind: "benchmark-link",
                source: endpoints[index % endpoints.length],
                target: endpoints[(index * 7 + 1) % endpoints.length],
                weight: (index % 5) + 1,
            })
        );
    }
    return relations;
}

function validateDefinition(definition: BenchmarkDatasetDefinition): void {
    for (const [name, value] of [
        ["entityCount", definition.entityCount],
        ["relationCount", definition.relationCount],
        ["worldWidth", definition.worldWidth],
        ["worldHeight", definition.worldHeight],
        ["placementIterations", definition.placementIterations],
    ] as const) {
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new RangeError(`${name} must be a positive safe integer.`);
        }
    }
}
