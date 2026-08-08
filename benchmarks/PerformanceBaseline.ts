import { Camera2D, CameraConfig } from "../src/engine/camera";
import { TerrainGenerator } from "../src/engine/terrain";
import type { KnowledgeGraph } from "../src/knowledge";
import { MusicInterpreter, type MusicCatalog } from "../src/music";
import { MusicJsonImporter } from "../src/music/import";
import {
    CanvasRenderer,
    SeventiesTheme,
    type LabelProvider,
    type VisualTheme,
} from "../src/render";
import type { GeographicWorld } from "../src/world";
import { WorldGenerator } from "../src/world";

import { CountingRenderSurface } from "./CountingRenderSurface";
import {
    benchmarkDatasetDefinitions,
    createBenchmarkDataset,
    placementDatasetDefinitions,
    terrainDatasetDefinitions,
    worldTerrainDatasetDefinitions,
    type BenchmarkDataset,
    type BenchmarkDatasetDefinition,
} from "./musicLibraryFixtures";

const WARMUP_RUNS = 2;
const MEASURED_RUNS = 5;

export interface BenchmarkRuntime {
    readonly now: () => number;
    readonly heapUsed: () => number;
    readonly collectGarbage?: () => void;
}

export interface TimingStatistics {
    readonly median: number;
    readonly minimum: number;
    readonly maximum: number;
}

export interface PerformanceProfileResult {
    readonly dataset: string;
    readonly entities: number;
    readonly relations: number;
    readonly locations: number;
    readonly connections: number;
    readonly world: string;
    readonly terrain: string;
    readonly terrainCells: number;
    readonly renderRectanglesPerFrame: number;
    readonly importMs: TimingStatistics;
    readonly knowledgeMs: TimingStatistics;
    readonly terrainMs: TimingStatistics;
    readonly worldMs: TimingStatistics;
    readonly renderLabelsMs: TimingStatistics;
    readonly renderNoLabelsMs: TimingStatistics;
    readonly totalMs: TimingStatistics;
    readonly heapBeforeBytes: number;
    readonly heapAfterBytes: number;
    readonly heapDeltaBytes: number;
}

export interface ScalingSeriesResult {
    readonly name: string;
    readonly entities: number;
    readonly relations: number;
    readonly terrain: string;
    readonly worldMs: TimingStatistics;
    readonly millisecondsPerNodeSquared: number;
}

export interface PerformanceBaselineReport {
    readonly warmupRuns: number;
    readonly measuredRuns: number;
    readonly profiles: readonly PerformanceProfileResult[];
    readonly placementSeries: readonly ScalingSeriesResult[];
    readonly terrainSeries: readonly ScalingSeriesResult[];
}

export interface WorldTerrainBenchmarkReport {
    readonly warmupRuns: number;
    readonly measuredRuns: number;
    readonly profiles: readonly PerformanceProfileResult[];
}

interface PreparedDataset {
    readonly dataset: BenchmarkDataset;
    readonly catalog: MusicCatalog;
    readonly graph: KnowledgeGraph;
    readonly world: GeographicWorld;
    readonly camera: Camera2D;
    readonly seed: number;
}

interface PipelineObservation {
    readonly entities: number;
    readonly relations: number;
    readonly locations: number;
    readonly connections: number;
}

export function runPerformanceBaseline(runtime: BenchmarkRuntime): PerformanceBaselineReport {
    const profiles = benchmarkDatasetDefinitions.map((definition) =>
        measureProfile(createBenchmarkDataset(definition), runtime)
    );
    const placementSeries = measureWorldSeries(placementDatasetDefinitions, runtime);
    const terrainSeries = measureWorldSeries(terrainDatasetDefinitions, runtime);

    return Object.freeze({
        warmupRuns: WARMUP_RUNS,
        measuredRuns: MEASURED_RUNS,
        profiles: Object.freeze(profiles),
        placementSeries: Object.freeze(placementSeries),
        terrainSeries: Object.freeze(terrainSeries),
    });
}

export function runWorldTerrainBenchmark(runtime: BenchmarkRuntime): WorldTerrainBenchmarkReport {
    return Object.freeze({
        warmupRuns: WARMUP_RUNS,
        measuredRuns: MEASURED_RUNS,
        profiles: Object.freeze(
            worldTerrainDatasetDefinitions.map((definition) =>
                measureProfile(createBenchmarkDataset(definition), runtime)
            )
        ),
    });
}

function measureProfile(
    dataset: BenchmarkDataset,
    runtime: BenchmarkRuntime
): PerformanceProfileResult {
    const prepared = prepareDataset(dataset);
    const importer = new MusicJsonImporter();
    const interpreter = new MusicInterpreter();
    const generator = new WorldGenerator();
    const labels: LabelProvider = (id) => ({ text: id, priority: 0, minZoom: 0 });
    const labelsRenderer = new CanvasRenderer(new SeventiesTheme(), labels);
    const noLabelsRenderer = new CanvasRenderer(
        createLabelsDisabledTheme(new SeventiesTheme()),
        labels
    );
    const labelsSurface = new CountingRenderSurface(1_024, 768);
    const noLabelsSurface = new CountingRenderSurface(1_024, 768);

    const importMs = measureRepeated(() => importer.import(dataset.document), runtime);
    const knowledgeMs = measureRepeated(() => interpreter.interpret(prepared.catalog), runtime);
    const worldMs = measureRepeated(
        () => generator.generate(prepared.seed, dataset.worldConfig, prepared.graph),
        runtime
    );
    const terrainMs = measureRepeated(
        () => new TerrainGenerator().generate(prepared.seed, dataset.worldConfig.terrain),
        runtime
    );
    const renderLabelsMs = measureRepeated(
        () => labelsRenderer.render(prepared.world, prepared.camera, labelsSurface),
        runtime
    );
    const renderNoLabelsMs = measureRepeated(
        () => noLabelsRenderer.render(prepared.world, prepared.camera, noLabelsSurface),
        runtime
    );
    // This is deliberately a separate experiment, never a sum of stage medians.
    const totalMs = measureRepeated(() => runCompletePipeline(dataset), runtime);

    runtime.collectGarbage?.();
    const heapBeforeBytes = runtime.heapUsed();
    const observation = runCompletePipeline(dataset);
    const heapAfterBytes = runtime.heapUsed();

    return Object.freeze({
        dataset: dataset.definition.name,
        entities: observation.entities,
        relations: observation.relations,
        locations: observation.locations,
        connections: observation.connections,
        world: `${dataset.worldConfig.width}x${dataset.worldConfig.height}`,
        terrain: terrainDimensions(dataset.definition),
        terrainCells: prepared.world.heightField.width * prepared.world.heightField.height,
        renderRectanglesPerFrame:
            prepared.world.heightField.width * prepared.world.heightField.height + 1,
        importMs,
        knowledgeMs,
        terrainMs,
        worldMs,
        renderLabelsMs,
        renderNoLabelsMs,
        totalMs,
        heapBeforeBytes,
        heapAfterBytes,
        heapDeltaBytes: heapAfterBytes - heapBeforeBytes,
    });
}

function measureWorldSeries(
    definitions: readonly BenchmarkDatasetDefinition[],
    runtime: BenchmarkRuntime
): ScalingSeriesResult[] {
    return definitions.map((definition) => {
        const prepared = prepareDataset(createBenchmarkDataset(definition));
        const generator = new WorldGenerator();
        const worldMs = measureRepeated(
            () => generator.generate(prepared.seed, prepared.dataset.worldConfig, prepared.graph),
            runtime
        );
        return Object.freeze({
            name: definition.name,
            entities: definition.entityCount,
            relations: definition.relationCount,
            terrain: terrainDimensions(definition),
            worldMs,
            millisecondsPerNodeSquared: worldMs.median / definition.entityCount ** 2,
        });
    });
}

function measureRepeated(action: () => unknown, runtime: BenchmarkRuntime): TimingStatistics {
    for (let run = 0; run < WARMUP_RUNS; run += 1) {
        action();
    }

    const durations: number[] = [];
    for (let run = 0; run < MEASURED_RUNS; run += 1) {
        const start = runtime.now();
        action();
        durations.push(runtime.now() - start);
    }
    durations.sort((left, right) => left - right);
    return Object.freeze({
        median: durations[Math.floor(durations.length / 2)],
        minimum: durations[0],
        maximum: durations[durations.length - 1],
    });
}

function prepareDataset(dataset: BenchmarkDataset): PreparedDataset {
    const imported = new MusicJsonImporter().import(dataset.document);
    const seed = requireSeed(imported.metadata.seed);
    const graph = new MusicInterpreter().interpret(imported.catalog);
    const world = new WorldGenerator().generate(seed, dataset.worldConfig, graph);
    return {
        dataset,
        catalog: imported.catalog,
        graph,
        world,
        camera: createCamera(dataset),
        seed,
    };
}

function runCompletePipeline(dataset: BenchmarkDataset): PipelineObservation {
    const imported = new MusicJsonImporter().import(dataset.document);
    const graph = new MusicInterpreter().interpret(imported.catalog);
    const world = new WorldGenerator().generate(
        requireSeed(imported.metadata.seed),
        dataset.worldConfig,
        graph
    );
    const surface = new CountingRenderSurface(1_024, 768);
    new CanvasRenderer(new SeventiesTheme()).render(world, createCamera(dataset), surface);

    if (surface.getCounts().rectangles !== world.heightField.width * world.heightField.height + 1) {
        throw new Error("Renderer did not visit every terrain cell.");
    }
    return {
        entities: imported.catalog.getEntities().length,
        relations: imported.catalog.getRelations().length,
        locations: world.getLocations().length,
        connections: world.getConnections().length,
    };
}

function createCamera(dataset: BenchmarkDataset): Camera2D {
    const camera = new Camera2D(
        new CameraConfig({
            viewportWidth: 1_024,
            viewportHeight: 768,
            minZoom: 0.25,
            maxZoom: 32,
            initialZoom: 12,
        })
    );
    camera.setPosition(dataset.worldConfig.width / 2, dataset.worldConfig.height / 2);
    return camera;
}

function createLabelsDisabledTheme(theme: VisualTheme): VisualTheme {
    return Object.freeze({
        ...theme,
        label: Object.freeze({ ...theme.label, enabled: false }),
    });
}

function requireSeed(seed: number | undefined): number {
    if (seed === undefined) {
        throw new Error("Benchmark fixture must define metadata.seed.");
    }
    return seed;
}

function terrainDimensions(definition: BenchmarkDatasetDefinition): string {
    return `${definition.terrainWidth ?? definition.worldWidth}x${
        definition.terrainHeight ?? definition.worldHeight
    }`;
}
