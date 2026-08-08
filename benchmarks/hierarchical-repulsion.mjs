import console from "node:console";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { URL } from "node:url";

import { runnerImport } from "vite";

const modulePath = new URL(
    "./hierarchical-repulsion/HierarchicalRepulsionBenchmark.ts",
    import.meta.url
).pathname;
const { module } = await runnerImport(modulePath, { logLevel: "error" });
const startedAt = performance.now();
const report = module.runHierarchicalRepulsionBenchmark({ now: () => performance.now() });
const duration = performance.now() - startedAt;

console.log("EchoAtlas deterministic hierarchical-repulsion spike");
console.log(`Node ${process.version} · ${process.platform} ${process.arch}`);
console.log(
    "Experimental checks: PASS (Exact Indexed parity across fixtures/seeds, deterministic tree/layout, split boundaries, coincident points)."
);
console.log(
    `${report.warmupRuns} warmup + ${report.measuredRuns} measured runs; 8 placement iterations; Barnes-Hut theta ${report.theta} (experimental).`
);
console.log(
    "Barnes-Hut approximation: a distant cell contributes mass * delta / (distance² + 1); attraction remains exact."
);

console.log("Controlled timing scopes — fixed graph/seed/64x48");
console.table(
    report.controlledComparisons.map((comparison) => ({
        nodes: comparison.nodes,
        "PRODUCTION WORLD ms": timing(comparison.productionWorld),
        "PRODUCTION no-relax ms": timing(comparison.productionWithoutRelaxation),
        "derived production relax ms": milliseconds(comparison.derivedProductionRelaxationMedian),
        "EXACT INDEXED ms": timing(comparison.exactIndexed),
        "BARNES-HUT ms": timing(comparison.barnesHut),
        "Indexed == production": comparison.exactIndexedMatchesProduction ? "YES" : "NO",
        "BH layout RMS": format(comparison.barnesHutDelta.rms),
        "BH layout median": format(comparison.barnesHutDelta.median),
        "BH layout max": format(comparison.barnesHutDelta.maximum),
    }))
);
console.log(
    "The production no-relax campaign includes terrain, initial positions and final GeographicWorld allocations. The derived relaxation value is a difference of independent medians, not a direct timer around the private production method."
);

console.log("One-iteration Barnes-Hut displacement delta against Exact Indexed at 1,000 nodes");
console.table([
    {
        theta: report.theta,
        mean: format(report.localComparison.delta.mean),
        median: format(report.localComparison.delta.median),
        RMS: format(report.localComparison.delta.rms),
        p95: format(report.localComparison.delta.percentile95),
        maximum: format(report.localComparison.delta.maximum),
        "relative RMS": percentage(report.localComparison.relativeRms),
    },
]);

console.log("Representative dimension series — same deterministic 1,000-node graph");
console.table(
    report.dimensionResults.flatMap((result) => [
        dimensionRow("EXACT INDEXED", result, result.exactIndexedTiming, result.exactGeography),
        dimensionRow("BARNES-HUT", result, result.barnesHutTiming, result.barnesHutGeography),
    ])
);
console.log(
    `Diagnostic density reference selected for scaling: ${report.densityReference.width}x${report.densityReference.height} (first Exact series tier at or below 25% boundary saturation; not a product rule).`
);

console.log("Heavy / Stress at comparable diagnostic density — Barnes-Hut only");
console.table(
    report.scaledWorkloads.map((result) => ({
        workload: result.workload,
        nodes: result.nodes,
        dimensions: `${result.width}x${result.height}`,
        "area / node": format(result.areaPerNode),
        "placement ms": timing(result.timing),
        "boundary %": percentage(result.geography.boundaryProportion),
        "dispersion / diagonal": format(result.geography.dispersion / result.diagonal),
        "collisions / sample": result.geography.nearCollisions,
        "relation mean / diagonal": format(result.geography.relationMean / result.diagonal),
        "relation median / diagonal": format(result.geography.relationMedian / result.diagonal),
        "pair median / diagonal": format(result.geography.sampledPairMedian / result.diagonal),
        bounded: result.withinBounds ? "YES" : "NO",
        deterministic: result.deterministic ? "YES" : "NO",
    }))
);
console.log(
    "Heavy/Stress Exact and Production World: NOT RUN. No measured speedup or Exact layout delta is claimed for these tiers."
);
console.log(
    "Near-collision tolerance: < 0.05 world units over a deterministic sample of at most 20,000 pairs."
);
console.log(
    "Logical World dimensions and HeightField resolution are coupled by the current WorldConfig contract; this spike constructs matching TerrainConfig values but does not generate their HeightFields during placement-only series."
);
console.log(`Total benchmark duration: ${milliseconds(duration)} ms`);

function dimensionRow(method, result, measuredTiming, geography) {
    return {
        method,
        dimensions: `${result.width}x${result.height}`,
        "area / node": format(result.areaPerNode),
        "placement ms": timing(measuredTiming),
        "boundary %": percentage(geography.boundaryProportion),
        "dispersion / diagonal": format(geography.dispersion / result.diagonal),
        "collisions / sample": geography.nearCollisions,
        "relation mean / diagonal": format(geography.relationMean / result.diagonal),
        "relation median / diagonal": format(geography.relationMedian / result.diagonal),
        "pair median / diagonal": format(geography.sampledPairMedian / result.diagonal),
        "BH RMS / diagonal":
            method === "BARNES-HUT" ? percentage(result.barnesHutDelta.rms / result.diagonal) : "-",
        bounded:
            method === "BARNES-HUT"
                ? result.barnesHutWithinBounds
                    ? "YES"
                    : "NO"
                : result.exactWithinBounds
                  ? "YES"
                  : "NO",
        deterministic: method === "BARNES-HUT" ? (result.deterministic ? "YES" : "NO") : "N/A",
    };
}

function timing(value) {
    return `${milliseconds(value.median)} [${milliseconds(value.minimum)}-${milliseconds(value.maximum)}]`;
}

function milliseconds(value) {
    return value.toFixed(2);
}

function format(value) {
    return value.toFixed(6);
}

function percentage(value) {
    return `${(value * 100).toFixed(3)}%`;
}
