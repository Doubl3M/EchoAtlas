import { DeterministicRandom, type SeedInput } from "../../src/engine/math";
import type { KnowledgeGraph } from "../../src/knowledge";
import type { WorldConfig } from "../../src/world";
import { BarnesHutPlacementStrategy } from "../../src/world/BarnesHutPlacementStrategy";
import { ExactIndexedPlacementStrategy } from "../../src/world/ExactIndexedPlacementStrategy";
import type { WorldPlacementRelation } from "../../src/world/WorldPlacementStrategy";

export interface ExperimentalLayout {
    readonly ids: readonly string[];
    readonly x: Float64Array;
    readonly y: Float64Array;
    readonly sourceIndices: Uint32Array;
    readonly targetIndices: Uint32Array;
    readonly relations: readonly WorldPlacementRelation[];
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
    const placementRelations = Object.freeze(
        relations.map(({ sourceId, targetId }) => Object.freeze({ sourceId, targetId }))
    );
    return { ids, x, y, sourceIndices, targetIndices, relations: placementRelations };
}

export function cloneLayout(layout: ExperimentalLayout): ExperimentalLayout {
    return {
        ids: layout.ids,
        x: layout.x.slice(),
        y: layout.y.slice(),
        sourceIndices: layout.sourceIndices,
        targetIndices: layout.targetIndices,
        relations: layout.relations,
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
    placementStrategy(method, theta).place({
        nodeIds: layout.ids,
        relations: layout.relations,
        initialPositions: layout,
        width: config.width,
        height: config.height,
        placementIterations: iterations,
        attractionStrength: config.attractionStrength,
        repulsionStrength: config.repulsionStrength,
    });
    return layout;
}

export function runIteration(
    layout: ExperimentalLayout,
    config: WorldConfig,
    method: RepulsionMethod,
    theta: number
): void {
    placementStrategy(method, theta).place({
        nodeIds: layout.ids,
        relations: layout.relations,
        initialPositions: layout,
        width: config.width,
        height: config.height,
        placementIterations: 1,
        attractionStrength: config.attractionStrength,
        repulsionStrength: config.repulsionStrength,
    });
}

function placementStrategy(
    method: RepulsionMethod,
    theta: number
): ExactIndexedPlacementStrategy | BarnesHutPlacementStrategy {
    return method === "EXACT"
        ? new ExactIndexedPlacementStrategy()
        : new BarnesHutPlacementStrategy(theta);
}

function requireIndex(indices: ReadonlyMap<string, number>, id: string): number {
    const index = indices.get(id);
    if (index === undefined) {
        throw new Error(`Missing experimental node index: ${id}`);
    }
    return index;
}
