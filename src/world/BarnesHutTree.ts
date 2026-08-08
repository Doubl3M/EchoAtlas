import type { IndexedWorldPositions } from "./WorldPlacementStrategy";

interface CellBounds {
    readonly minimumX: number;
    readonly minimumY: number;
    readonly maximumX: number;
    readonly maximumY: number;
}

interface BarnesHutCell extends CellBounds {
    readonly mass: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly coincident: boolean;
    readonly leafIndices: Uint32Array | undefined;
    readonly children: readonly BarnesHutChild[];
}

interface BarnesHutChild {
    readonly quadrant: number;
    readonly cell: BarnesHutCell;
}

const MAXIMUM_DEPTH = 32;

/**
 * Internal deterministic 2D Barnes-Hut tree.
 *
 * Points must be supplied in canonical node-ID order. Split-boundary points belong to east and
 * south, and children are stored and visited NW, NE, SW, SE. Only leaves retain point indices;
 * internal cells retain their aggregate mass and center of mass.
 */
export class BarnesHutTree {
    private readonly root: BarnesHutCell;

    public constructor(
        private readonly nodeIds: readonly string[],
        private readonly positions: IndexedWorldPositions,
        width: number,
        height: number
    ) {
        validatePointSet(nodeIds, positions, width, height);
        const indices = Array.from({ length: nodeIds.length }, (_value, index) => index);
        this.root = buildCell(
            positions,
            indices,
            { minimumX: 0, minimumY: 0, maximumX: width - 1, maximumY: height - 1 },
            0
        );
    }

    public accumulateRepulsion(
        targetIndex: number,
        theta: number,
        strength: number,
        displacementX: Float64Array,
        displacementY: Float64Array
    ): void {
        if (
            !Number.isInteger(targetIndex) ||
            targetIndex < 0 ||
            targetIndex >= this.nodeIds.length
        ) {
            throw new RangeError("Barnes-Hut target index must identify an existing point.");
        }
        if (!Number.isFinite(theta) || theta <= 0) {
            throw new RangeError("Barnes-Hut theta must be finite and greater than zero.");
        }
        if (!Number.isFinite(strength)) {
            throw new RangeError("Barnes-Hut repulsion strength must be finite.");
        }
        if (
            displacementX.length !== this.nodeIds.length ||
            displacementY.length !== this.nodeIds.length
        ) {
            throw new RangeError("Barnes-Hut displacement buffers must match the point count.");
        }
        this.visit(this.root, targetIndex, true, theta, strength, displacementX, displacementY);
    }

    private visit(
        cell: BarnesHutCell,
        targetIndex: number,
        containsTarget: boolean,
        theta: number,
        strength: number,
        displacementX: Float64Array,
        displacementY: Float64Array
    ): void {
        if (cell.mass === 0) {
            return;
        }
        if (cell.leafIndices !== undefined) {
            this.visitLeaf(
                cell,
                targetIndex,
                containsTarget,
                strength,
                displacementX,
                displacementY
            );
            return;
        }

        const targetX = this.positions.x[targetIndex];
        const targetY = this.positions.y[targetIndex];
        const deltaX = targetX - cell.centerX;
        const deltaY = targetY - cell.centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const size = Math.max(cell.maximumX - cell.minimumX, cell.maximumY - cell.minimumY);
        // A cell containing the target is always opened, so its aggregate can never include the
        // target's own mass. All other sufficiently distant cells use the validated approximation.
        if (!containsTarget && distance > 0 && size / distance < theta) {
            addAggregateForce(
                targetIndex,
                deltaX,
                deltaY,
                cell.mass,
                strength,
                displacementX,
                displacementY
            );
            return;
        }

        const targetQuadrant = barnesHutQuadrantFor(
            targetX,
            targetY,
            (cell.minimumX + cell.maximumX) / 2,
            (cell.minimumY + cell.maximumY) / 2
        );
        for (const child of cell.children) {
            this.visit(
                child.cell,
                targetIndex,
                containsTarget && child.quadrant === targetQuadrant,
                theta,
                strength,
                displacementX,
                displacementY
            );
        }
    }

    private visitLeaf(
        cell: BarnesHutCell,
        targetIndex: number,
        containsTarget: boolean,
        strength: number,
        displacementX: Float64Array,
        displacementY: Float64Array
    ): void {
        const indices = cell.leafIndices;
        if (indices === undefined) {
            return;
        }
        if (cell.coincident && indices.length > 1) {
            if (containsTarget) {
                const rank = findSortedIndex(indices, targetIndex);
                const lowerIds = rank;
                const higherIds = indices.length - rank - 1;
                displacementX[targetIndex] += (lowerIds - higherIds) * (strength / 2);
            } else {
                addAggregateForce(
                    targetIndex,
                    this.positions.x[targetIndex] - cell.centerX,
                    this.positions.y[targetIndex] - cell.centerY,
                    cell.mass,
                    strength,
                    displacementX,
                    displacementY
                );
            }
            return;
        }
        for (const sourceIndex of indices) {
            if (sourceIndex !== targetIndex) {
                addExactPointForce(
                    this.nodeIds,
                    this.positions,
                    targetIndex,
                    sourceIndex,
                    strength,
                    displacementX,
                    displacementY
                );
            }
        }
    }
}

export function barnesHutQuadrantFor(
    x: number,
    y: number,
    midpointX: number,
    midpointY: number
): number {
    return (y >= midpointY ? 2 : 0) + (x >= midpointX ? 1 : 0);
}

function buildCell(
    positions: IndexedWorldPositions,
    indices: readonly number[],
    bounds: CellBounds,
    depth: number
): BarnesHutCell {
    let sumX = 0;
    let sumY = 0;
    for (const index of indices) {
        sumX += positions.x[index];
        sumY += positions.y[index];
    }
    const mass = indices.length;
    const centerX = mass === 0 ? 0 : sumX / mass;
    const centerY = mass === 0 ? 0 : sumY / mass;
    const firstIndex = indices[0];
    const coincident =
        mass > 1 &&
        indices.every(
            (index) =>
                positions.x[index] === positions.x[firstIndex] &&
                positions.y[index] === positions.y[firstIndex]
        );
    const midpointX = (bounds.minimumX + bounds.maximumX) / 2;
    const midpointY = (bounds.minimumY + bounds.maximumY) / 2;
    const canSubdivide =
        depth < MAXIMUM_DEPTH &&
        (midpointX > bounds.minimumX || midpointY > bounds.minimumY) &&
        (midpointX < bounds.maximumX || midpointY < bounds.maximumY);

    if (mass <= 1 || coincident || !canSubdivide) {
        return {
            ...bounds,
            mass,
            centerX,
            centerY,
            coincident,
            leafIndices: Uint32Array.from(indices),
            children: [],
        };
    }

    const buckets: number[][] = [[], [], [], []];
    for (const index of indices) {
        buckets[
            barnesHutQuadrantFor(positions.x[index], positions.y[index], midpointX, midpointY)
        ].push(index);
    }
    const childBounds: readonly CellBounds[] = [
        { ...bounds, maximumX: midpointX, maximumY: midpointY },
        { ...bounds, minimumX: midpointX, maximumY: midpointY },
        { ...bounds, minimumY: midpointY, maximumX: midpointX },
        { ...bounds, minimumX: midpointX, minimumY: midpointY },
    ];
    const children: BarnesHutChild[] = [];
    for (let quadrant = 0; quadrant < buckets.length; quadrant += 1) {
        if (buckets[quadrant].length > 0) {
            children.push({
                quadrant,
                cell: buildCell(positions, buckets[quadrant], childBounds[quadrant], depth + 1),
            });
        }
    }
    return {
        ...bounds,
        mass,
        centerX,
        centerY,
        coincident: false,
        leafIndices: undefined,
        children,
    };
}

function findSortedIndex(indices: Uint32Array, target: number): number {
    let low = 0;
    let high = indices.length - 1;
    while (low <= high) {
        const middle = (low + high) >>> 1;
        if (indices[middle] === target) {
            return middle;
        }
        if (indices[middle] < target) {
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }
    throw new Error("Barnes-Hut target is absent from its containing leaf.");
}

function addAggregateForce(
    targetIndex: number,
    deltaX: number,
    deltaY: number,
    mass: number,
    strength: number,
    displacementX: Float64Array,
    displacementY: Float64Array
): void {
    const scale = (strength * mass) / (deltaX * deltaX + deltaY * deltaY + 1);
    displacementX[targetIndex] += deltaX * scale;
    displacementY[targetIndex] += deltaY * scale;
}

function addExactPointForce(
    nodeIds: readonly string[],
    positions: IndexedWorldPositions,
    targetIndex: number,
    sourceIndex: number,
    strength: number,
    displacementX: Float64Array,
    displacementY: Float64Array
): void {
    let deltaX = positions.x[targetIndex] - positions.x[sourceIndex];
    const deltaY = positions.y[targetIndex] - positions.y[sourceIndex];
    if (deltaX === 0 && deltaY === 0) {
        deltaX = nodeIds[targetIndex] < nodeIds[sourceIndex] ? -1 : 1;
    }
    const scale = strength / (deltaX * deltaX + deltaY * deltaY + 1);
    displacementX[targetIndex] += deltaX * scale;
    displacementY[targetIndex] += deltaY * scale;
}

function validatePointSet(
    nodeIds: readonly string[],
    positions: IndexedWorldPositions,
    width: number,
    height: number
): void {
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        throw new RangeError("Barnes-Hut dimensions must be finite and greater than zero.");
    }
    if (positions.x.length !== nodeIds.length || positions.y.length !== nodeIds.length) {
        throw new RangeError("Barnes-Hut position buffers must match the node count.");
    }
    for (let index = 0; index < nodeIds.length; index += 1) {
        const x = positions.x[index];
        const y = positions.y[index];
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new RangeError("Barnes-Hut positions must be finite.");
        }
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) {
            throw new RangeError("Barnes-Hut positions must be within World bounds.");
        }
    }
}
