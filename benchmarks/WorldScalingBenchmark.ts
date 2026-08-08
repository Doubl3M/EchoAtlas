import { MusicInterpreter } from "../src/music";
import { MusicJsonImporter } from "../src/music/import";
import { WorldGenerator } from "../src/world";

import { createBenchmarkDataset } from "./musicLibraryFixtures";
import type { BenchmarkDatasetDefinition } from "./musicLibraryFixtures";
import {
    defaultWorldScalingDefinitions,
    targetWorldScalingDefinitions,
    worldScalingWorkloads,
} from "./worldScalingWorkloads";

const WARMUP_RUNS = 1;
const MEASURED_RUNS = 3;
const MAX_DEFAULT_TIER_CAMPAIGN_MS = 30_000;

export interface WorldScalingRuntime {
    readonly now: () => number;
}

export interface WorldScalingTiming {
    readonly median: number;
    readonly minimum: number;
    readonly maximum: number;
}

export interface MeasuredWorldScalingTier {
    readonly status: "MEASURED";
    readonly workload: string | undefined;
    readonly nodes: number;
    readonly relations: number;
    readonly timing: WorldScalingTiming;
    readonly millisecondsPerNodeSquared: number;
    readonly growthFactor: number | undefined;
}

export interface ProjectedWorldScalingTier {
    readonly status: "PROJECTED";
    readonly execution: "NOT RUN";
    readonly workload: string;
    readonly nodes: number;
    readonly relations: number;
    readonly projectedMedian: number;
    readonly projectedCampaign: number;
    readonly reason: string;
}

export interface WorldScalingReport {
    readonly warmupRuns: number;
    readonly measuredRuns: number;
    readonly guardCampaignMilliseconds: number;
    readonly forcedTargets: boolean;
    readonly measured: readonly MeasuredWorldScalingTier[];
    readonly projected: readonly ProjectedWorldScalingTier[];
}

export interface WorldScalingOptions {
    readonly forceTargets?: boolean;
}

export function runWorldScalingBenchmark(
    runtime: WorldScalingRuntime,
    options: WorldScalingOptions = {}
): WorldScalingReport {
    const measured: MeasuredWorldScalingTier[] = [];
    for (const definition of defaultWorldScalingDefinitions) {
        measured.push(measureTier(definition, runtime, measured.at(-1)));
    }

    const projected: ProjectedWorldScalingTier[] = [];
    for (const definition of targetWorldScalingDefinitions) {
        const projection = projectTier(definition, measured);
        if (!options.forceTargets && projection.projectedCampaign > MAX_DEFAULT_TIER_CAMPAIGN_MS) {
            projected.push(projection);
            continue;
        }
        measured.push(measureTier(definition, runtime, measured.at(-1)));
    }

    return Object.freeze({
        warmupRuns: WARMUP_RUNS,
        measuredRuns: MEASURED_RUNS,
        guardCampaignMilliseconds: MAX_DEFAULT_TIER_CAMPAIGN_MS,
        forcedTargets: options.forceTargets === true,
        measured: Object.freeze(measured),
        projected: Object.freeze(projected),
    });
}

export function projectTier(
    definition: BenchmarkDatasetDefinition,
    measured: readonly MeasuredWorldScalingTier[]
): ProjectedWorldScalingTier {
    const largeMeasurements = measured.slice(-2);
    if (largeMeasurements.length < 2) {
        throw new Error("At least two measured tiers are required for a quadratic projection.");
    }
    const coefficients = largeMeasurements
        .map(({ millisecondsPerNodeSquared }) => millisecondsPerNodeSquared)
        .sort((left, right) => left - right);
    const coefficient = (coefficients[0] + coefficients[1]) / 2;
    const projectedMedian = coefficient * definition.entityCount ** 2;
    const projectedCampaign = projectedMedian * (WARMUP_RUNS + MEASURED_RUNS);
    const workload = requireWorkloadName(definition.entityCount);

    return Object.freeze({
        status: "PROJECTED",
        execution: "NOT RUN",
        workload,
        nodes: definition.entityCount,
        relations: definition.relationCount,
        projectedMedian,
        projectedCampaign,
        reason: `projected repeated campaign exceeds the ${MAX_DEFAULT_TIER_CAMPAIGN_MS} ms benchmark guard`,
    });
}

function measureTier(
    definition: BenchmarkDatasetDefinition,
    runtime: WorldScalingRuntime,
    previous: MeasuredWorldScalingTier | undefined
): MeasuredWorldScalingTier {
    const dataset = createBenchmarkDataset(definition);
    const imported = new MusicJsonImporter().import(dataset.document);
    const graph = new MusicInterpreter().interpret(imported.catalog);
    const seed = imported.metadata.seed;
    if (seed === undefined) {
        throw new Error("World scaling fixture must define metadata.seed.");
    }
    const generator = new WorldGenerator();
    const action = (): void => {
        generator.generate(seed, dataset.worldConfig, graph);
    };
    const timing = measureRepeated(action, runtime);

    return Object.freeze({
        status: "MEASURED",
        workload: workloadName(definition.entityCount),
        nodes: definition.entityCount,
        relations: definition.relationCount,
        timing,
        millisecondsPerNodeSquared: timing.median / definition.entityCount ** 2,
        growthFactor: previous === undefined ? undefined : timing.median / previous.timing.median,
    });
}

function measureRepeated(action: () => void, runtime: WorldScalingRuntime): WorldScalingTiming {
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
        median: durations[1],
        minimum: durations[0],
        maximum: durations[2],
    });
}

function workloadName(nodeCount: number): string | undefined {
    return worldScalingWorkloads.find((workload) => workload.nodeCount === nodeCount)?.name;
}

function requireWorkloadName(nodeCount: number): string {
    const name = workloadName(nodeCount);
    if (name === undefined) {
        throw new Error(`Missing workload name for ${nodeCount} nodes.`);
    }
    return name;
}
