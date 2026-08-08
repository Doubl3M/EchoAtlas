export interface BarnesHutPointSet {
    readonly ids: readonly string[];
    readonly x: Float64Array;
    readonly y: Float64Array;
}

interface CellBounds {
    readonly minimumX: number;
    readonly minimumY: number;
    readonly maximumX: number;
    readonly maximumY: number;
}

interface BarnesHutCell extends CellBounds {
    readonly indices: readonly number[];
    readonly mass: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly coincident: boolean;
    readonly children: readonly BarnesHutChild[];
}

interface BarnesHutChild {
    readonly quadrant: number;
    readonly cell: BarnesHutCell;
}

const MAXIMUM_DEPTH = 32;

/**
 * Experimental deterministic 2D Barnes-Hut tree.
 *
 * Points arrive in canonical ID order. A point on a split belongs to east/south (`>= midpoint`).
 * Children are visited NW, NE, SW, SE. Coincident points remain in one leaf and their ID-directed
 * collision force is aggregated exactly; other crowded leaves stop at maximum depth or once
 * floating-point subdivision can no longer shrink a cell. Centers of mass are accumulated in the
 * canonical order retained by every cell.
 */
export class BarnesHutTree {
    private readonly root: BarnesHutCell;

    public constructor(
        private readonly points: BarnesHutPointSet,
        width: number,
        height: number
    ) {
        const indices = points.ids.map((_id, index) => index);
        this.root = buildCell(
            points,
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

        if (cell.children.length === 0) {
            if (cell.coincident && cell.indices.length > 1) {
                if (containsTarget) {
                    const rank = cell.indices.indexOf(targetIndex);
                    const lowerIds = rank;
                    const higherIds = cell.indices.length - rank - 1;
                    displacementX[targetIndex] += (lowerIds - higherIds) * (strength / 2);
                } else {
                    const deltaX = this.points.x[targetIndex] - cell.centerX;
                    const deltaY = this.points.y[targetIndex] - cell.centerY;
                    const scale = (strength * cell.mass) / (deltaX * deltaX + deltaY * deltaY + 1);
                    displacementX[targetIndex] += deltaX * scale;
                    displacementY[targetIndex] += deltaY * scale;
                }
                return;
            }
            for (const sourceIndex of cell.indices) {
                if (sourceIndex !== targetIndex) {
                    addExactPointForce(
                        this.points,
                        targetIndex,
                        sourceIndex,
                        strength,
                        displacementX,
                        displacementY
                    );
                }
            }
            return;
        }

        const targetX = this.points.x[targetIndex];
        const targetY = this.points.y[targetIndex];
        const deltaX = targetX - cell.centerX;
        const deltaY = targetY - cell.centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const size = Math.max(cell.maximumX - cell.minimumX, cell.maximumY - cell.minimumY);
        if (!containsTarget && distance > 0 && size / distance < theta) {
            const scale = (strength * cell.mass) / (deltaX * deltaX + deltaY * deltaY + 1);
            displacementX[targetIndex] += deltaX * scale;
            displacementY[targetIndex] += deltaY * scale;
            return;
        }

        const targetQuadrant = quadrantFor(
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
}

function buildCell(
    points: BarnesHutPointSet,
    indices: readonly number[],
    bounds: CellBounds,
    depth: number
): BarnesHutCell {
    let centerX = 0;
    let centerY = 0;
    for (const index of indices) {
        centerX += points.x[index];
        centerY += points.y[index];
    }
    const mass = indices.length;
    if (mass > 0) {
        centerX /= mass;
        centerY /= mass;
    }
    const firstIndex = indices[0];
    const coincident =
        mass > 1 &&
        indices.every(
            (index) =>
                points.x[index] === points.x[firstIndex] && points.y[index] === points.y[firstIndex]
        );

    const midpointX = (bounds.minimumX + bounds.maximumX) / 2;
    const midpointY = (bounds.minimumY + bounds.maximumY) / 2;
    const canSubdivide =
        depth < MAXIMUM_DEPTH &&
        (midpointX > bounds.minimumX || midpointY > bounds.minimumY) &&
        (midpointX < bounds.maximumX || midpointY < bounds.maximumY);

    if (mass <= 1 || coincident || !canSubdivide) {
        return { ...bounds, indices, mass, centerX, centerY, coincident, children: [] };
    }

    const buckets: number[][] = [[], [], [], []];
    for (const index of indices) {
        buckets[quadrantFor(points.x[index], points.y[index], midpointX, midpointY)].push(index);
    }
    const childBounds: readonly CellBounds[] = [
        {
            minimumX: bounds.minimumX,
            minimumY: bounds.minimumY,
            maximumX: midpointX,
            maximumY: midpointY,
        },
        {
            minimumX: midpointX,
            minimumY: bounds.minimumY,
            maximumX: bounds.maximumX,
            maximumY: midpointY,
        },
        {
            minimumX: bounds.minimumX,
            minimumY: midpointY,
            maximumX: midpointX,
            maximumY: bounds.maximumY,
        },
        {
            minimumX: midpointX,
            minimumY: midpointY,
            maximumX: bounds.maximumX,
            maximumY: bounds.maximumY,
        },
    ];
    const children = buckets.flatMap((bucket, quadrant): readonly BarnesHutChild[] =>
        bucket.length === 0
            ? []
            : [
                  {
                      quadrant,
                      cell: buildCell(points, bucket, childBounds[quadrant], depth + 1),
                  },
              ]
    );
    return { ...bounds, indices, mass, centerX, centerY, coincident, children };
}

function quadrantFor(x: number, y: number, midpointX: number, midpointY: number): number {
    const east = x >= midpointX;
    const south = y >= midpointY;
    return (south ? 2 : 0) + (east ? 1 : 0);
}

function addExactPointForce(
    points: BarnesHutPointSet,
    targetIndex: number,
    sourceIndex: number,
    strength: number,
    displacementX: Float64Array,
    displacementY: Float64Array
): void {
    let deltaX = points.x[targetIndex] - points.x[sourceIndex];
    const deltaY = points.y[targetIndex] - points.y[sourceIndex];
    if (deltaX === 0 && deltaY === 0) {
        deltaX = points.ids[targetIndex] < points.ids[sourceIndex] ? -1 : 1;
    }
    const scale = strength / (deltaX * deltaX + deltaY * deltaY + 1);
    displacementX[targetIndex] += deltaX * scale;
    displacementY[targetIndex] += deltaY * scale;
}
