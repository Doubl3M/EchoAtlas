import type { ExperimentalLayout } from "./LayoutExperiment";

export interface DistributionMetrics {
    readonly mean: number;
    readonly median: number;
    readonly percentile95: number;
    readonly rms: number;
    readonly maximum: number;
}

export interface GeographicMetrics {
    readonly relationMean: number;
    readonly relationMedian: number;
    readonly sampledPairMedian: number;
    readonly nearCollisions: number;
    readonly dispersion: number;
    readonly boundaryProportion: number;
}

const NEAR_COLLISION_DISTANCE = 0.05;
const MAXIMUM_SAMPLED_PAIRS = 20_000;

export function compareLayouts(
    exact: ExperimentalLayout,
    approximate: ExperimentalLayout
): DistributionMetrics {
    const distances = new Array<number>(exact.ids.length);
    for (let index = 0; index < exact.ids.length; index += 1) {
        distances[index] = distance(
            exact.x[index],
            exact.y[index],
            approximate.x[index],
            approximate.y[index]
        );
    }
    return distribution(distances);
}

export function geographicMetrics(
    layout: ExperimentalLayout,
    width: number,
    height: number
): GeographicMetrics {
    const relationLengths = new Array<number>(layout.sourceIndices.length);
    for (let index = 0; index < layout.sourceIndices.length; index += 1) {
        const source = layout.sourceIndices[index];
        const target = layout.targetIndices[index];
        relationLengths[index] = distance(
            layout.x[source],
            layout.y[source],
            layout.x[target],
            layout.y[target]
        );
    }

    const sampledDistances: number[] = [];
    let nearCollisions = 0;
    const pairCount = (layout.ids.length * Math.max(0, layout.ids.length - 1)) / 2;
    const sampleCount = Math.min(pairCount, MAXIMUM_SAMPLED_PAIRS);
    for (let sample = 0; sample < sampleCount; sample += 1) {
        const left = sample % layout.ids.length;
        let right = (sample * 7_919 + 1) % layout.ids.length;
        if (right === left) {
            right = (right + 1) % layout.ids.length;
        }
        const pairDistance = distance(
            layout.x[left],
            layout.y[left],
            layout.x[right],
            layout.y[right]
        );
        sampledDistances.push(pairDistance);
        if (pairDistance < NEAR_COLLISION_DISTANCE) {
            nearCollisions += 1;
        }
    }

    const centerX = mean(layout.x);
    const centerY = mean(layout.y);
    let squaredRadius = 0;
    let boundaryCount = 0;
    for (let index = 0; index < layout.ids.length; index += 1) {
        const deltaX = layout.x[index] - centerX;
        const deltaY = layout.y[index] - centerY;
        squaredRadius += deltaX * deltaX + deltaY * deltaY;
        if (
            layout.x[index] === 0 ||
            layout.x[index] === width - 1 ||
            layout.y[index] === 0 ||
            layout.y[index] === height - 1
        ) {
            boundaryCount += 1;
        }
    }
    const relationDistribution = distribution(relationLengths);
    return Object.freeze({
        relationMean: relationDistribution.mean,
        relationMedian: relationDistribution.median,
        sampledPairMedian: distribution(sampledDistances).median,
        nearCollisions,
        dispersion: layout.ids.length === 0 ? 0 : Math.sqrt(squaredRadius / layout.ids.length),
        boundaryProportion: layout.ids.length === 0 ? 0 : boundaryCount / layout.ids.length,
    });
}

function distribution(values: readonly number[]): DistributionMetrics {
    if (values.length === 0) {
        return Object.freeze({ mean: 0, median: 0, percentile95: 0, rms: 0, maximum: 0 });
    }
    const sorted = [...values].sort((left, right) => left - right);
    let sum = 0;
    let squaredSum = 0;
    for (const value of sorted) {
        sum += value;
        squaredSum += value * value;
    }
    return Object.freeze({
        mean: sum / sorted.length,
        median: percentile(sorted, 0.5),
        percentile95: percentile(sorted, 0.95),
        rms: Math.sqrt(squaredSum / sorted.length),
        maximum: sorted.at(-1) ?? 0,
    });
}

function percentile(sorted: readonly number[], proportion: number): number {
    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * proportion))] ?? 0;
}

function mean(values: Float64Array): number {
    let sum = 0;
    for (const value of values) {
        sum += value;
    }
    return values.length === 0 ? 0 : sum / values.length;
}

function distance(leftX: number, leftY: number, rightX: number, rightY: number): number {
    return Math.hypot(leftX - rightX, leftY - rightY);
}
