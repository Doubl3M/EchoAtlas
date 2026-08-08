import type { SeedInput } from "../../src/engine/math";
import type { KnowledgeGraph } from "../../src/knowledge";
import { MusicInterpreter } from "../../src/music";
import { MusicJsonImporter } from "../../src/music/import";
import { WorldConfig, WorldGenerator } from "../../src/world";
import { BarnesHutTree } from "../../src/world/BarnesHutTree";

import { createBenchmarkDataset } from "../musicLibraryFixtures";
import type { BenchmarkDatasetDefinition } from "../musicLibraryFixtures";
import {
    cloneLayout,
    createExperimentalLayout,
    runIteration,
    runLayout,
    type ExperimentalLayout,
} from "./LayoutExperiment";
import {
    compareLayouts,
    geographicMetrics,
    type DistributionMetrics,
    type GeographicMetrics,
} from "./LayoutMetrics";

const CANDIDATE_THETA = 0.7;
const WARMUP_RUNS = 1;
const MEASURED_RUNS = 3;
const RELATION_RATIO = 1.5;
const PLACEMENT_ITERATIONS = 8;
const REPRESENTATIVE_NODES = 1_000;
const REPRESENTATIVE_DIMENSIONS = Object.freeze([
    Object.freeze({ width: 64, height: 48 }),
    Object.freeze({ width: 128, height: 96 }),
    Object.freeze({ width: 256, height: 192 }),
    Object.freeze({ width: 512, height: 384 }),
]);
const DENSITY_BOUNDARY_DIAGNOSTIC_THRESHOLD = 0.25;

export interface ExperimentRuntime {
    readonly now: () => number;
}

export interface ExperimentTiming {
    readonly median: number;
    readonly minimum: number;
    readonly maximum: number;
}

export interface ControlledComparison {
    readonly nodes: number;
    readonly productionWorld: ExperimentTiming;
    readonly productionWithoutRelaxation: ExperimentTiming;
    readonly derivedProductionRelaxationMedian: number;
    readonly exactIndexed: ExperimentTiming;
    readonly barnesHut: ExperimentTiming;
    readonly exactIndexedMatchesProduction: boolean;
    readonly barnesHutDelta: DistributionMetrics;
}

export interface DimensionResult {
    readonly nodes: number;
    readonly width: number;
    readonly height: number;
    readonly areaPerNode: number;
    readonly diagonal: number;
    readonly exactIndexedTiming: ExperimentTiming;
    readonly barnesHutTiming: ExperimentTiming;
    readonly exactGeography: GeographicMetrics;
    readonly barnesHutGeography: GeographicMetrics;
    readonly barnesHutDelta: DistributionMetrics;
    readonly exactWithinBounds: boolean;
    readonly barnesHutWithinBounds: boolean;
    readonly deterministic: boolean;
}

export interface ScaledWorkloadResult {
    readonly workload: "Heavy" | "Stress";
    readonly nodes: number;
    readonly width: number;
    readonly height: number;
    readonly areaPerNode: number;
    readonly diagonal: number;
    readonly timing: ExperimentTiming;
    readonly geography: GeographicMetrics;
    readonly withinBounds: boolean;
    readonly deterministic: boolean;
}

export interface LocalComparison {
    readonly delta: DistributionMetrics;
    readonly relativeRms: number;
}

export interface HierarchicalRepulsionReport {
    readonly warmupRuns: number;
    readonly measuredRuns: number;
    readonly theta: number;
    readonly controlledComparisons: readonly ControlledComparison[];
    readonly localComparison: LocalComparison;
    readonly dimensionResults: readonly DimensionResult[];
    readonly densityReference: { readonly width: number; readonly height: number };
    readonly scaledWorkloads: readonly ScaledWorkloadResult[];
}

export function runHierarchicalRepulsionBenchmark(
    runtime: ExperimentRuntime
): HierarchicalRepulsionReport {
    runExperimentalChecks();
    const controlledComparisons = Object.freeze(
        [1_000, 2_000].map((nodes) => controlledComparison(nodes, runtime))
    );
    const representative = prepareWorkload("Representative", REPRESENTATIVE_NODES, 64, 48);
    const exactOneIteration = runLayout(
        representative.initial,
        representative.config,
        "EXACT",
        0,
        1
    );
    const hierarchicalOneIteration = runLayout(
        representative.initial,
        representative.config,
        "HIERARCHICAL",
        CANDIDATE_THETA,
        1
    );
    const localDelta = compareLayouts(exactOneIteration, hierarchicalOneIteration);
    const exactMovement = compareLayouts(representative.initial, exactOneIteration);
    const localComparison = Object.freeze({
        delta: localDelta,
        relativeRms: exactMovement.rms === 0 ? 0 : localDelta.rms / exactMovement.rms,
    });

    const dimensionResults = Object.freeze(
        REPRESENTATIVE_DIMENSIONS.map(({ width, height }) =>
            measureDimension(REPRESENTATIVE_NODES, width, height, runtime)
        )
    );
    const densityReferenceResult =
        dimensionResults.find(
            ({ exactGeography }) =>
                exactGeography.boundaryProportion <= DENSITY_BOUNDARY_DIAGNOSTIC_THRESHOLD
        ) ?? dimensionResults.at(-1);
    if (densityReferenceResult === undefined) {
        throw new Error("Representative dimension series must not be empty.");
    }
    const densityReference = Object.freeze({
        width: densityReferenceResult.width,
        height: densityReferenceResult.height,
    });
    const scaledWorkloads = Object.freeze(
        [
            { workload: "Heavy" as const, nodes: 5_000 },
            { workload: "Stress" as const, nodes: 10_000 },
        ].map(({ workload, nodes }) => {
            const scale = Math.sqrt(nodes / REPRESENTATIVE_NODES);
            const width = Math.max(1, Math.round(densityReference.width * scale));
            const height = Math.max(1, Math.round(densityReference.height * scale));
            return measureScaledWorkload(workload, nodes, width, height, runtime);
        })
    );

    return Object.freeze({
        warmupRuns: WARMUP_RUNS,
        measuredRuns: MEASURED_RUNS,
        theta: CANDIDATE_THETA,
        controlledComparisons,
        localComparison,
        dimensionResults,
        densityReference,
        scaledWorkloads,
    });
}

function controlledComparison(nodes: number, runtime: ExperimentRuntime): ControlledComparison {
    const workload = prepareWorkload(`controlled-${nodes}`, nodes, 64, 48);
    const withoutRelaxation = configWithoutRelaxation(workload.config);
    const generator = new WorldGenerator();
    const productionWorld = measureRepeated(
        () => generator.generate(workload.seed, workload.config, workload.graph),
        runtime
    );
    const productionWithoutRelaxation = measureRepeated(
        () => generator.generate(workload.seed, withoutRelaxation, workload.graph),
        runtime
    );
    const exactIndexedLayout = runLayout(workload.initial, workload.config, "EXACT", 0);
    const productionLocations = generator
        .generate(workload.seed, workload.config, workload.graph)
        .getLocations();
    const exactIndexedMatchesProduction = productionLocations.every(
        (location, index) =>
            location.knowledgeNodeId === exactIndexedLayout.ids[index] &&
            location.x === exactIndexedLayout.x[index] &&
            location.y === exactIndexedLayout.y[index]
    );
    const exactIndexed = measureRepeated(
        () => runLayout(workload.initial, workload.config, "EXACT", 0),
        runtime
    );
    const barnesHutLayout = runLayout(
        workload.initial,
        workload.config,
        "HIERARCHICAL",
        CANDIDATE_THETA
    );
    const barnesHut = measureRepeated(
        () => runLayout(workload.initial, workload.config, "HIERARCHICAL", CANDIDATE_THETA),
        runtime
    );
    return Object.freeze({
        nodes,
        productionWorld,
        productionWithoutRelaxation,
        derivedProductionRelaxationMedian:
            productionWorld.median - productionWithoutRelaxation.median,
        exactIndexed,
        barnesHut,
        exactIndexedMatchesProduction,
        barnesHutDelta: compareLayouts(exactIndexedLayout, barnesHutLayout),
    });
}

function measureDimension(
    nodes: number,
    width: number,
    height: number,
    runtime: ExperimentRuntime
): DimensionResult {
    const workload = prepareWorkload(`dimensions-${width}x${height}`, nodes, width, height);
    const exact = runLayout(workload.initial, workload.config, "EXACT", 0);
    const barnesHut = runLayout(workload.initial, workload.config, "HIERARCHICAL", CANDIDATE_THETA);
    const repeatedBarnesHut = runLayout(
        workload.initial,
        workload.config,
        "HIERARCHICAL",
        CANDIDATE_THETA
    );
    return Object.freeze({
        nodes,
        width,
        height,
        areaPerNode: (width * height) / nodes,
        diagonal: Math.hypot(width - 1, height - 1),
        exactIndexedTiming: measureRepeated(
            () => runLayout(workload.initial, workload.config, "EXACT", 0),
            runtime
        ),
        barnesHutTiming: measureRepeated(
            () => runLayout(workload.initial, workload.config, "HIERARCHICAL", CANDIDATE_THETA),
            runtime
        ),
        exactGeography: geographicMetrics(exact, width, height),
        barnesHutGeography: geographicMetrics(barnesHut, width, height),
        barnesHutDelta: compareLayouts(exact, barnesHut),
        exactWithinBounds: layoutIsWithinBounds(exact, width, height),
        barnesHutWithinBounds: layoutIsWithinBounds(barnesHut, width, height),
        deterministic: layoutsAreIdentical(barnesHut, repeatedBarnesHut),
    });
}

function measureScaledWorkload(
    workloadName: "Heavy" | "Stress",
    nodes: number,
    width: number,
    height: number,
    runtime: ExperimentRuntime
): ScaledWorkloadResult {
    const workload = prepareWorkload(workloadName, nodes, width, height);
    const first = runLayout(workload.initial, workload.config, "HIERARCHICAL", CANDIDATE_THETA);
    const second = runLayout(workload.initial, workload.config, "HIERARCHICAL", CANDIDATE_THETA);
    return Object.freeze({
        workload: workloadName,
        nodes,
        width,
        height,
        areaPerNode: (width * height) / nodes,
        diagonal: Math.hypot(width - 1, height - 1),
        timing: measureRepeated(
            () => runLayout(workload.initial, workload.config, "HIERARCHICAL", CANDIDATE_THETA),
            runtime
        ),
        geography: geographicMetrics(first, width, height),
        withinBounds: layoutIsWithinBounds(first, width, height),
        deterministic: layoutsAreIdentical(first, second),
    });
}

interface PreparedWorkload {
    readonly name: string;
    readonly seed: SeedInput;
    readonly graph: KnowledgeGraph;
    readonly config: WorldConfig;
    readonly initial: ExperimentalLayout;
}

function prepareWorkload(
    name: string,
    nodeCount: number,
    width: number,
    height: number
): PreparedWorkload {
    const definition: BenchmarkDatasetDefinition = {
        name: `hierarchical-${name.toLowerCase()}`,
        entityCount: nodeCount,
        relationCount: Math.round(nodeCount * RELATION_RATIO),
        worldWidth: width,
        worldHeight: height,
        placementIterations: PLACEMENT_ITERATIONS,
    };
    const dataset = createBenchmarkDataset(definition);
    const imported = new MusicJsonImporter().import(dataset.document);
    const graph = new MusicInterpreter().interpret(imported.catalog);
    const seed = imported.metadata.seed;
    if (seed === undefined) {
        throw new Error("Hierarchical-repulsion fixture must define metadata.seed.");
    }
    return Object.freeze({
        name,
        seed,
        graph,
        config: dataset.worldConfig,
        initial: createExperimentalLayout(seed, dataset.worldConfig, graph),
    });
}

function configWithoutRelaxation(config: WorldConfig): WorldConfig {
    return new WorldConfig({
        generationVersion: "world-v1-exact",
        width: config.width,
        height: config.height,
        placementIterations: 0,
        attractionStrength: config.attractionStrength,
        repulsionStrength: config.repulsionStrength,
        terrain: config.terrain,
    });
}

function measureRepeated(action: () => unknown, runtime: ExperimentRuntime): ExperimentTiming {
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
    return Object.freeze({ median: durations[1], minimum: durations[0], maximum: durations[2] });
}

function layoutsAreIdentical(left: ExperimentalLayout, right: ExperimentalLayout): boolean {
    return (
        left.ids.length === right.ids.length &&
        left.ids.every(
            (_id, index) => left.x[index] === right.x[index] && left.y[index] === right.y[index]
        )
    );
}

function layoutIsWithinBounds(layout: ExperimentalLayout, width: number, height: number): boolean {
    return layout.ids.every(
        (_id, index) =>
            layout.x[index] >= 0 &&
            layout.x[index] <= width - 1 &&
            layout.y[index] >= 0 &&
            layout.y[index] <= height - 1
    );
}

/** Small command-local assertions: these are deliberately excluded from the Vitest suite. */
function runExperimentalChecks(): void {
    for (const nodes of [40, 160]) {
        const workload = prepareWorkload(`parity-${nodes}`, nodes, 64, 48);
        for (const seed of [2_011_091, -7, "indexed-parity"] as const) {
            verifyExactIndexedParity(seed, workload.config, workload.graph);
        }
    }

    const boundaryAndCollisionLayout: ExperimentalLayout = {
        ids: Object.freeze(["A", "B", "C", "D"]),
        x: new Float64Array([0, 31.5, 31.5, 63]),
        y: new Float64Array([0, 23.5, 23.5, 47]),
        sourceIndices: new Uint32Array(),
        targetIndices: new Uint32Array(),
        relations: Object.freeze([]),
    };
    const firstX = new Float64Array(4);
    const firstY = new Float64Array(4);
    const secondX = new Float64Array(4);
    const secondY = new Float64Array(4);
    const firstTree = new BarnesHutTree(
        boundaryAndCollisionLayout.ids,
        boundaryAndCollisionLayout,
        64,
        48
    );
    const secondTree = new BarnesHutTree(
        boundaryAndCollisionLayout.ids,
        boundaryAndCollisionLayout,
        64,
        48
    );
    for (let index = 0; index < 4; index += 1) {
        firstTree.accumulateRepulsion(index, CANDIDATE_THETA, 0.8, firstX, firstY);
        secondTree.accumulateRepulsion(index, CANDIDATE_THETA, 0.8, secondX, secondY);
    }
    assertCondition(numericArraysAreIdentical(firstX, secondX), "Boundary x forces differ.");
    assertCondition(numericArraysAreIdentical(firstY, secondY), "Boundary y forces differ.");
    assertCondition(
        [...firstX, ...firstY].every(Number.isFinite),
        "Collision force is not finite."
    );

    const workload = prepareWorkload("finite-check", 40, 64, 48);
    const changed = cloneLayout(workload.initial);
    runIteration(changed, workload.config, "HIERARCHICAL", CANDIDATE_THETA);
    assertCondition(changed.x.every(Number.isFinite), "Experimental x coordinate is not finite.");
    assertCondition(changed.y.every(Number.isFinite), "Experimental y coordinate is not finite.");
}

function verifyExactIndexedParity(
    seed: SeedInput,
    config: WorldConfig,
    graph: KnowledgeGraph
): void {
    const initial = createExperimentalLayout(seed, config, graph);
    const exact = runLayout(initial, config, "EXACT", 0);
    const production = new WorldGenerator().generate(seed, config, graph).getLocations();
    assertCondition(production.length === exact.ids.length, "Exact layout size differs.");
    for (let index = 0; index < exact.ids.length; index += 1) {
        assertCondition(
            production[index].knowledgeNodeId === exact.ids[index],
            "Exact ID differs."
        );
        assertCondition(production[index].x === exact.x[index], "Exact x coordinate differs.");
        assertCondition(production[index].y === exact.y[index], "Exact y coordinate differs.");
    }
}

function numericArraysAreIdentical(left: Float64Array, right: Float64Array): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertCondition(condition: boolean, message: string): asserts condition {
    if (!condition) {
        throw new Error(`Experimental check failed: ${message}`);
    }
}
