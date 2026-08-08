import console from "node:console";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { URL } from "node:url";

import { runnerImport } from "vite";

const modulePath = new URL("./PerformanceBaseline.ts", import.meta.url).pathname;
const { module } = await runnerImport(modulePath, { logLevel: "error" });
const benchmarkStart = performance.now();
const report = module.runWorldTerrainBenchmark({
    now: () => performance.now(),
    heapUsed: () => process.memoryUsage().heapUsed,
    collectGarbage: globalThis.gc,
});
const benchmarkDuration = performance.now() - benchmarkStart;

console.log("EchoAtlas World / Terrain Resolution Comparison");
console.log(`Node ${process.version} · ${process.platform} ${process.arch}`);
console.log(
    `${report.warmupRuns} warmups + ${report.measuredRuns} measured runs per timing; values are median [min-max].`
);
console.table(
    report.profiles.map((result) => ({
        dataset: result.dataset,
        World: result.world,
        Terrain: result.terrain,
        cells: result.terrainCells,
        "terrain ms": formatTiming(result.terrainMs),
        "world ms": formatTiming(result.worldMs),
        "renderer ms": formatTiming(result.renderLabelsMs),
        "render rectangles/frame": result.renderRectanglesPerFrame,
        "heap delta MiB": formatMebibytes(result.heapDeltaBytes),
    }))
);
console.log(
    "Heap deltas are directional indicators after an explicit pre-run GC; Renderer timings measure abstract RenderSurface commands."
);
console.log(`Total benchmark duration: ${formatMilliseconds(benchmarkDuration)} ms`);

function formatTiming(timing) {
    return `${formatMilliseconds(timing.median)} [${formatMilliseconds(timing.minimum)}-${formatMilliseconds(timing.maximum)}]`;
}

function formatMilliseconds(value) {
    return value.toFixed(2);
}

function formatMebibytes(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}
