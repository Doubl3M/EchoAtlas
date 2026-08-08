import { DeterministicRandom, type Seed, type SeedInput } from "../engine/math";
import type { KnowledgeNode, KnowledgeRelation } from "../knowledge";

import type { WorldConfig } from "./WorldConfig";

export interface IndexedWorldPositions {
    readonly x: Float64Array;
    readonly y: Float64Array;
}

/** Internal exact placement using canonical numeric indices instead of IDs in the hot loop. */
export function placeKnowledgeNodes(
    seed: SeedInput | Seed,
    config: WorldConfig,
    nodes: readonly KnowledgeNode[],
    relations: readonly KnowledgeRelation[]
): IndexedWorldPositions {
    const nodeIds = nodes.map(({ id }) => id);
    const positions = createInitialPositions(seed, config, nodeIds);
    const relationIndices = indexRelations(nodeIds, relations);
    relaxPositions(nodeIds, positions, relationIndices, config);
    return positions;
}

interface IndexedRelations {
    readonly sources: Uint32Array;
    readonly targets: Uint32Array;
}

function createInitialPositions(
    seed: SeedInput | Seed,
    config: WorldConfig,
    nodeIds: readonly string[]
): IndexedWorldPositions {
    const x = new Float64Array(nodeIds.length);
    const y = new Float64Array(nodeIds.length);
    const random = new DeterministicRandom(seed);
    for (let index = 0; index < nodeIds.length; index += 1) {
        const nodeRandom = random.fork(`world-location:${nodeIds[index]}`);
        x[index] = randomCoordinate(nodeRandom, config.width);
        y[index] = randomCoordinate(nodeRandom, config.height);
    }
    return { x, y };
}

function randomCoordinate(random: DeterministicRandom, size: number): number {
    return size === 1 ? 0 : random.nextRange(0, size - 1);
}

function indexRelations(
    nodeIds: readonly string[],
    relations: readonly KnowledgeRelation[]
): IndexedRelations {
    const nodeIndices = new Map(nodeIds.map((id, index) => [id, index]));
    const sources = new Uint32Array(relations.length);
    const targets = new Uint32Array(relations.length);
    for (let index = 0; index < relations.length; index += 1) {
        sources[index] = requireNodeIndex(nodeIndices, relations[index].sourceId);
        targets[index] = requireNodeIndex(nodeIndices, relations[index].targetId);
    }
    return { sources, targets };
}

function requireNodeIndex(indices: ReadonlyMap<string, number>, nodeId: string): number {
    const index = indices.get(nodeId);
    if (index === undefined) {
        throw new Error(`Missing position for node ID: ${nodeId}`);
    }
    return index;
}

function relaxPositions(
    nodeIds: readonly string[],
    positions: IndexedWorldPositions,
    relations: IndexedRelations,
    config: WorldConfig
): void {
    const displacementX = new Float64Array(nodeIds.length);
    const displacementY = new Float64Array(nodeIds.length);
    for (let iteration = 0; iteration < config.placementIterations; iteration += 1) {
        // Reusing buffers is safe because every force is accumulated before any position moves.
        displacementX.fill(0);
        displacementY.fill(0);
        applyRepulsion(nodeIds, positions, displacementX, displacementY, config.repulsionStrength);
        applyAttraction(
            positions,
            relations,
            displacementX,
            displacementY,
            config.attractionStrength
        );
        applyDisplacements(positions, displacementX, displacementY, config);
    }
}

function applyRepulsion(
    nodeIds: readonly string[],
    positions: IndexedWorldPositions,
    displacementX: Float64Array,
    displacementY: Float64Array,
    strength: number
): void {
    for (let left = 0; left < nodeIds.length; left += 1) {
        for (let right = left + 1; right < nodeIds.length; right += 1) {
            let deltaX = positions.x[left] - positions.x[right];
            const deltaY = positions.y[left] - positions.y[right];
            if (deltaX === 0 && deltaY === 0) {
                deltaX = nodeIds[left] < nodeIds[right] ? -1 : 1;
            }
            // Preserve the exact pair order and unit softening of the procedural contract.
            const scale = strength / (deltaX * deltaX + deltaY * deltaY + 1);
            displacementX[left] += deltaX * scale;
            displacementY[left] += deltaY * scale;
            displacementX[right] -= deltaX * scale;
            displacementY[right] -= deltaY * scale;
        }
    }
}

function applyAttraction(
    positions: IndexedWorldPositions,
    relations: IndexedRelations,
    displacementX: Float64Array,
    displacementY: Float64Array,
    strength: number
): void {
    for (let index = 0; index < relations.sources.length; index += 1) {
        const source = relations.sources[index];
        const target = relations.targets[index];
        // Knowledge weights have no normalized geographic meaning, so topology alone attracts.
        const deltaX = (positions.x[target] - positions.x[source]) * strength;
        const deltaY = (positions.y[target] - positions.y[source]) * strength;
        displacementX[source] += deltaX;
        displacementY[source] += deltaY;
        displacementX[target] -= deltaX;
        displacementY[target] -= deltaY;
    }
}

function applyDisplacements(
    positions: IndexedWorldPositions,
    displacementX: Float64Array,
    displacementY: Float64Array,
    config: WorldConfig
): void {
    for (let index = 0; index < positions.x.length; index += 1) {
        positions.x[index] = clamp(positions.x[index] + displacementX[index], 0, config.width - 1);
        positions.y[index] = clamp(positions.y[index] + displacementY[index], 0, config.height - 1);
    }
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}
