import { DeterministicRandom, type SeedInput } from "../../src/engine/math";
import type { KnowledgeGraph } from "../../src/knowledge";
import type { WorldConfig } from "../../src/world";

import { BarnesHutTree } from "./BarnesHutTree";

export interface ExperimentalLayout {
    readonly ids: readonly string[];
    readonly x: Float64Array;
    readonly y: Float64Array;
    readonly sourceIndices: Uint32Array;
    readonly targetIndices: Uint32Array;
}

export type RepulsionMethod = "EXACT" | "HIERARCHICAL";

export function createExperimentalLayout(
    seed: SeedInput,
    config: WorldConfig,
    graph: KnowledgeGraph
): ExperimentalLayout {
    const nodes = graph.getNodes();
    const ids = Object.freeze(nodes.map(({ id }) => id));
    const indexById = new Map(ids.map((id, index) => [id, index]));
    const x = new Float64Array(ids.length);
    const y = new Float64Array(ids.length);
    const random = new DeterministicRandom(seed);
    for (let index = 0; index < ids.length; index += 1) {
        const nodeRandom = random.fork(`world-location:${ids[index]}`);
        x[index] = config.width === 1 ? 0 : nodeRandom.nextRange(0, config.width - 1);
        y[index] = config.height === 1 ? 0 : nodeRandom.nextRange(0, config.height - 1);
    }
    const relations = graph.getRelations();
    const sourceIndices = new Uint32Array(relations.length);
    const targetIndices = new Uint32Array(relations.length);
    for (let index = 0; index < relations.length; index += 1) {
        sourceIndices[index] = requireIndex(indexById, relations[index].sourceId);
        targetIndices[index] = requireIndex(indexById, relations[index].targetId);
    }
    return { ids, x, y, sourceIndices, targetIndices };
}

export function cloneLayout(layout: ExperimentalLayout): ExperimentalLayout {
    return {
        ids: layout.ids,
        x: layout.x.slice(),
        y: layout.y.slice(),
        sourceIndices: layout.sourceIndices,
        targetIndices: layout.targetIndices,
    };
}

export function runLayout(
    initial: ExperimentalLayout,
    config: WorldConfig,
    method: RepulsionMethod,
    theta: number,
    iterations = config.placementIterations
): ExperimentalLayout {
    const layout = cloneLayout(initial);
    for (let iteration = 0; iteration < iterations; iteration += 1) {
        runIteration(layout, config, method, theta);
    }
    return layout;
}

export function runIteration(
    layout: ExperimentalLayout,
    config: WorldConfig,
    method: RepulsionMethod,
    theta: number
): void {
    const displacementX = new Float64Array(layout.ids.length);
    const displacementY = new Float64Array(layout.ids.length);
    if (method === "EXACT") {
        applyExactRepulsion(layout, config.repulsionStrength, displacementX, displacementY);
    } else {
        const tree = new BarnesHutTree(layout, config.width, config.height);
        for (let index = 0; index < layout.ids.length; index += 1) {
            tree.accumulateRepulsion(
                index,
                theta,
                config.repulsionStrength,
                displacementX,
                displacementY
            );
        }
    }
    applyAttraction(layout, config.attractionStrength, displacementX, displacementY);
    for (let index = 0; index < layout.ids.length; index += 1) {
        layout.x[index] = clamp(layout.x[index] + displacementX[index], 0, config.width - 1);
        layout.y[index] = clamp(layout.y[index] + displacementY[index], 0, config.height - 1);
    }
}

function applyExactRepulsion(
    layout: ExperimentalLayout,
    strength: number,
    displacementX: Float64Array,
    displacementY: Float64Array
): void {
    for (let left = 0; left < layout.ids.length; left += 1) {
        for (let right = left + 1; right < layout.ids.length; right += 1) {
            let deltaX = layout.x[left] - layout.x[right];
            const deltaY = layout.y[left] - layout.y[right];
            if (deltaX === 0 && deltaY === 0) {
                deltaX = layout.ids[left] < layout.ids[right] ? -1 : 1;
            }
            const scale = strength / (deltaX * deltaX + deltaY * deltaY + 1);
            displacementX[left] += deltaX * scale;
            displacementY[left] += deltaY * scale;
            displacementX[right] -= deltaX * scale;
            displacementY[right] -= deltaY * scale;
        }
    }
}

function applyAttraction(
    layout: ExperimentalLayout,
    strength: number,
    displacementX: Float64Array,
    displacementY: Float64Array
): void {
    for (let index = 0; index < layout.sourceIndices.length; index += 1) {
        const source = layout.sourceIndices[index];
        const target = layout.targetIndices[index];
        const deltaX = (layout.x[target] - layout.x[source]) * strength;
        const deltaY = (layout.y[target] - layout.y[source]) * strength;
        displacementX[source] += deltaX;
        displacementY[source] += deltaY;
        displacementX[target] -= deltaX;
        displacementY[target] -= deltaY;
    }
}

function requireIndex(indices: ReadonlyMap<string, number>, id: string): number {
    const index = indices.get(id);
    if (index === undefined) {
        throw new Error(`Missing experimental node index: ${id}`);
    }
    return index;
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}
