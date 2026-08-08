import console from "node:console";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { URL } from "node:url";

import { runnerImport } from "vite";

const modulePath = new URL("./PerformanceBaseline.ts", import.meta.url).pathname;
const { module } = await runnerImport(modulePath, { logLevel: "error" });
const baselineStart = performance.now();
const report = module.runPerformanceBaseline({
    now: () => performance.now(),
    heapUsed: () => process.memoryUsage().heapUsed,
    collectGarbage: globalThis.gc,
});
const baselineDuration = performance.now() - baselineStart;

console.log("EchoAtlas Performance Baseline");
console.log(`Node ${process.version} · ${process.platform} ${process.arch}`);
console.log(
    `${report.warmupRuns} warmups + ${report.measuredRuns} measured runs per timing; values are median [min-max].`
);
console.table(
    report.profiles.map((result) => ({
        dataset: result.dataset,
        entities: result.entities,
        relations: result.relations,
        terrain: result.terrain,
        "import ms": formatTiming(result.importMs),
        "knowledge ms": formatTiming(result.knowledgeMs),
        "world ms": formatTiming(result.worldMs),
        "render labels ms": formatTiming(result.renderLabelsMs),
        "render no labels ms": formatTiming(result.renderNoLabelsMs),
        "total ms": formatTiming(result.totalMs),
        "heap delta MiB": formatMebibytes(result.heapDeltaBytes),
    }))
);
console.log("Domain object counts");
console.table(
    report.profiles.map((result) => ({
        dataset: result.dataset,
        MusicEntity: result.entities,
        KnowledgeNode: result.entities,
        KnowledgeRelation: result.relations,
        WorldLocation: result.locations,
        WorldConnection: result.connections,
        HeightField: result.terrain,
        "heap before MiB": formatMebibytes(result.heapBeforeBytes),
        "heap after MiB": formatMebibytes(result.heapAfterBytes),
    }))
);
console.log("Placement scaling (fixed 64x48 terrain)");
console.table(
    report.placementSeries.map((result) => ({
        dataset: result.name,
        entities: result.entities,
        relations: result.relations,
        "world ms": formatTiming(result.worldMs),
        "median ms / n²": result.millisecondsPerNodeSquared.toFixed(8),
    }))
);
console.log("Terrain scaling (fixed 40-entity / 60-relation graph)");
console.table(
    report.terrainSeries.map((result) => ({
        dataset: result.name,
        terrain: result.terrain,
        cells: result.terrain
            .split("x")
            .map(Number)
            .reduce((product, value) => product * value, 1),
        "world ms": formatTiming(result.worldMs),
    }))
);
console.log(
    "Memory deltas are directional heap indicators after an explicit pre-run GC, not absolute object sizes."
);
console.log(
    "Renderer timings measure traversal and RenderSurface commands; browser Canvas painting is excluded."
);
console.log(`Total benchmark duration: ${formatMilliseconds(baselineDuration)} ms`);

function formatTiming(timing) {
    return `${formatMilliseconds(timing.median)} [${formatMilliseconds(timing.minimum)}-${formatMilliseconds(timing.maximum)}]`;
}

function formatMilliseconds(value) {
    return value.toFixed(2);
}

function formatMebibytes(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}
