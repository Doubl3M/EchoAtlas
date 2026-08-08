import console from "node:console";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { URL } from "node:url";

import { runnerImport } from "vite";

const modulePath = new URL("./WorldScalingBenchmark.ts", import.meta.url).pathname;
const { module } = await runnerImport(modulePath, { logLevel: "error" });
const startedAt = performance.now();
const report = module.runWorldScalingBenchmark(
    { now: () => performance.now() },
    { forceTargets: process.argv.includes("--force-targets") }
);
const duration = performance.now() - startedAt;

console.log("EchoAtlas WorldGenerator Scaling");
console.log(`Node ${process.version} · ${process.platform} ${process.arch}`);
console.log(
    `${report.warmupRuns} warmup + ${report.measuredRuns} measured runs; fixed terrain 64x48; 8 placement iterations.`
);
console.table(
    report.measured.map((tier) => ({
        status: tier.status,
        workload: tier.workload ?? "characterization",
        nodes: tier.nodes,
        relations: tier.relations,
        "world ms median": formatMilliseconds(tier.timing.median),
        "min-max ms": `${formatMilliseconds(tier.timing.minimum)}-${formatMilliseconds(tier.timing.maximum)}`,
        "ms / n²": tier.millisecondsPerNodeSquared.toFixed(8),
        "growth vs previous":
            tier.growthFactor === undefined ? "-" : `${tier.growthFactor.toFixed(2)}x`,
    }))
);

if (report.projected.length > 0) {
    console.log("Target workloads not executed by default");
    console.table(
        report.projected.map((tier) => ({
            status: `${tier.status} / ${tier.execution}`,
            workload: tier.workload,
            nodes: tier.nodes,
            relations: tier.relations,
            "projected median ms": formatMilliseconds(tier.projectedMedian),
            "projected campaign ms": formatMilliseconds(tier.projectedCampaign),
            reason: tier.reason,
        }))
    );
}

console.log(
    `Guard: ${report.guardCampaignMilliseconds} ms per repeated target campaign; benchmark protection only, not a product budget.`
);
console.log(`Total benchmark duration: ${formatMilliseconds(duration)} ms`);

function formatMilliseconds(value) {
    return value.toFixed(2);
}
