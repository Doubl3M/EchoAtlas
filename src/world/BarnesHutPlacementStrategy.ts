import { BarnesHutTree } from "./BarnesHutTree";
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

const MAXIMUM_PLACEMENT_ITERATIONS = 1_000;

/** Internal deterministic Barnes-Hut placement candidate. Not selected by any generation version. */
export class BarnesHutPlacementStrategy implements WorldPlacementStrategy {
    public constructor(private readonly theta: number) {
        if (!Number.isFinite(theta) || theta <= 0) {
            throw new RangeError("Barnes-Hut theta must be finite and greater than zero.");
        }
    }

    public place(input: WorldPlacementInput): IndexedWorldPositions {
        validateInput(input);
        const relations = indexRelations(input.nodeIds, input.relations);
        const displacementX = new Float64Array(input.nodeIds.length);
        const displacementY = new Float64Array(input.nodeIds.length);
        for (let iteration = 0; iteration < input.placementIterations; iteration += 1) {
            displacementX.fill(0);
            displacementY.fill(0);
            const tree = new BarnesHutTree(
                input.nodeIds,
                input.initialPositions,
                input.width,
                input.height
            );
            for (let index = 0; index < input.nodeIds.length; index += 1) {
                tree.accumulateRepulsion(
                    index,
                    this.theta,
                    input.repulsionStrength,
                    displacementX,
                    displacementY
                );
            }
            applyAttraction(
                input.initialPositions,
                relations,
                displacementX,
                displacementY,
                input.attractionStrength
            );
            applyDisplacements(input, displacementX, displacementY);
        }
        return input.initialPositions;
    }
}

function indexRelations(
    nodeIds: readonly string[],
    relations: readonly WorldPlacementRelation[]
): IndexedRelations {
    const indices = new Map(nodeIds.map((id, index) => [id, index]));
    const sources = new Uint32Array(relations.length);
    const targets = new Uint32Array(relations.length);
    for (let index = 0; index < relations.length; index += 1) {
        sources[index] = requireNodeIndex(indices, relations[index].sourceId);
        targets[index] = requireNodeIndex(indices, relations[index].targetId);
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
    for (let index = 0; index < input.nodeIds.length; index += 1) {
        const x = input.initialPositions.x[index] + displacementX[index];
        const y = input.initialPositions.y[index] + displacementY[index];
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new RangeError("Barnes-Hut placement produced a non-finite coordinate.");
        }
        input.initialPositions.x[index] = clamp(x, 0, input.width - 1);
        input.initialPositions.y[index] = clamp(y, 0, input.height - 1);
    }
}

function validateInput(input: WorldPlacementInput): void {
    if (!Number.isSafeInteger(input.width) || input.width <= 0) {
        throw new RangeError("World placement width must be a positive safe integer.");
    }
    if (!Number.isSafeInteger(input.height) || input.height <= 0) {
        throw new RangeError("World placement height must be a positive safe integer.");
    }
    if (
        !Number.isInteger(input.placementIterations) ||
        input.placementIterations < 0 ||
        input.placementIterations > MAXIMUM_PLACEMENT_ITERATIONS
    ) {
        throw new RangeError(
            `World placement iterations must be an integer in [0, ${MAXIMUM_PLACEMENT_ITERATIONS}].`
        );
    }
    if (!isValidStrength(input.attractionStrength) || !isValidStrength(input.repulsionStrength)) {
        throw new RangeError("World placement strengths must be finite and in [0, 1].");
    }
    if (
        input.initialPositions.x.length !== input.nodeIds.length ||
        input.initialPositions.y.length !== input.nodeIds.length
    ) {
        throw new RangeError("World placement position buffers must match the node count.");
    }
}

function isValidStrength(value: number): boolean {
    return Number.isFinite(value) && value >= 0 && value <= 1;
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}
