import type {
    IndexedWorldPositions,
    WorldPlacementInput,
    WorldPlacementRelation,
    WorldPlacementStrategy,
} from "./WorldPlacementStrategy";

interface IndexedRelations {
    readonly sources: Uint32Array;
    readonly targets: Uint32Array;
}

/** Internal exact placement using canonical numeric indices in the hot loop. */
export class ExactIndexedPlacementStrategy implements WorldPlacementStrategy {
    public place(input: WorldPlacementInput): IndexedWorldPositions {
        const relationIndices = indexRelations(input.nodeIds, input.relations);
        relaxPositions(input, relationIndices);
        return input.initialPositions;
    }
}

function indexRelations(
    nodeIds: readonly string[],
    relations: readonly WorldPlacementRelation[]
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

function relaxPositions(input: WorldPlacementInput, relations: IndexedRelations): void {
    const displacementX = new Float64Array(input.nodeIds.length);
    const displacementY = new Float64Array(input.nodeIds.length);
    for (let iteration = 0; iteration < input.placementIterations; iteration += 1) {
        // Reusing buffers is safe because every force is accumulated before any position moves.
        displacementX.fill(0);
        displacementY.fill(0);
        applyRepulsion(
            input.nodeIds,
            input.initialPositions,
            displacementX,
            displacementY,
            input.repulsionStrength
        );
        applyAttraction(
            input.initialPositions,
            relations,
            displacementX,
            displacementY,
            input.attractionStrength
        );
        applyDisplacements(input, displacementX, displacementY);
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
    input: WorldPlacementInput,
    displacementX: Float64Array,
    displacementY: Float64Array
): void {
    for (let index = 0; index < input.initialPositions.x.length; index += 1) {
        input.initialPositions.x[index] = clamp(
            input.initialPositions.x[index] + displacementX[index],
            0,
            input.width - 1
        );
        input.initialPositions.y[index] = clamp(
            input.initialPositions.y[index] + displacementY[index],
            0,
            input.height - 1
        );
    }
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}
