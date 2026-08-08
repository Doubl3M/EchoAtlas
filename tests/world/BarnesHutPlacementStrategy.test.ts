import { describe, expect, it } from "vitest";

import { BarnesHutPlacementStrategy } from "../../src/world/BarnesHutPlacementStrategy";
import { BarnesHutTree, barnesHutQuadrantFor } from "../../src/world/BarnesHutTree";
import type { WorldPlacementInput } from "../../src/world/WorldPlacementStrategy";

const THETA = 0.7;

function input(
    nodeIds: readonly string[],
    x: readonly number[],
    y: readonly number[],
    overrides: Partial<WorldPlacementInput> = {}
): WorldPlacementInput {
    return {
        nodeIds,
        relations: [],
        initialPositions: { x: Float64Array.from(x), y: Float64Array.from(y) },
        width: 100,
        height: 80,
        placementIterations: 8,
        attractionStrength: 0.035,
        repulsionStrength: 0.25,
        ...overrides,
    };
}

function signature(result: ReturnType<BarnesHutPlacementStrategy["place"]>): readonly number[] {
    return [...result.x, ...result.y];
}

describe("BarnesHutPlacementStrategy", () => {
    it.each([0, -0.1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects invalid theta %s",
        (theta) => {
            expect(() => new BarnesHutPlacementStrategy(theta)).toThrow(RangeError);
        }
    );

    it("is strictly deterministic for identical canonical inputs", () => {
        const first = input(["A", "B", "C", "D"], [5, 15, 30, 70], [10, 60, 20, 50], {
            relations: [
                { sourceId: "A", targetId: "C" },
                { sourceId: "B", targetId: "D" },
            ],
        });
        const second = input(["A", "B", "C", "D"], [5, 15, 30, 70], [10, 60, 20, 50], {
            relations: first.relations,
        });

        expect(signature(new BarnesHutPlacementStrategy(THETA).place(second))).toEqual(
            signature(new BarnesHutPlacementStrategy(THETA).place(first))
        );
    });

    it("preserves results after differently ordered data is put in canonical order", () => {
        const records = [
            { id: "C", x: 30, y: 20 },
            { id: "A", x: 5, y: 10 },
            { id: "B", x: 15, y: 60 },
        ];
        const canonicalize = (values: typeof records): WorldPlacementInput => {
            const sorted = [...values].sort((left, right) =>
                left.id < right.id ? -1 : left.id > right.id ? 1 : 0
            );
            return input(
                sorted.map(({ id }) => id),
                sorted.map(({ x }) => x),
                sorted.map(({ y }) => y)
            );
        };

        const first = new BarnesHutPlacementStrategy(THETA).place(canonicalize(records));
        const second = new BarnesHutPlacementStrategy(THETA).place(
            canonicalize([...records].reverse())
        );

        expect(signature(second)).toEqual(signature(first));
    });

    it("uses deterministic NW, NE, SW, SE boundary quadrants", () => {
        expect(barnesHutQuadrantFor(4, 4, 5, 5)).toBe(0);
        expect(barnesHutQuadrantFor(5, 4, 5, 5)).toBe(1);
        expect(barnesHutQuadrantFor(4, 5, 5, 5)).toBe(2);
        expect(barnesHutQuadrantFor(5, 5, 5, 5)).toBe(3);
    });

    it("resolves two and several coincident points deterministically", () => {
        const two = new BarnesHutPlacementStrategy(THETA).place(
            input(["A", "B"], [20, 20], [20, 20], { placementIterations: 1 })
        );
        const several = new BarnesHutPlacementStrategy(THETA).place(
            input(["A", "B", "C", "D"], [20, 20, 20, 20], [20, 20, 20, 20], {
                placementIterations: 1,
            })
        );

        expect([...two.x]).toEqual([19.875, 20.125]);
        expect([...several.x]).toEqual([19.625, 19.875, 20.125, 20.375]);
        expect([...several.y]).toEqual([20, 20, 20, 20]);
    });

    it("never approximates a cell that contains the target", () => {
        const positions = { x: new Float64Array([0, 10]), y: new Float64Array([0, 0]) };
        const tree = new BarnesHutTree(["A", "B"], positions, 11, 1);
        const displacementX = new Float64Array(2);
        const displacementY = new Float64Array(2);

        tree.accumulateRepulsion(0, 1_000, 1, displacementX, displacementY);

        expect(displacementX[0]).toBe(-10 / 101);
        expect(displacementY[0]).toBe(0);
    });

    it("remains finite when maximum depth or floating-point subdivision stops a leaf", () => {
        const origin = 50;
        const next = origin + Number.EPSILON * origin;
        const result = new BarnesHutPlacementStrategy(THETA).place(
            input(["A", "B", "C"], [origin, next, next], [origin, origin, next], {
                placementIterations: 2,
            })
        );

        expect([...result.x, ...result.y].every(Number.isFinite)).toBe(true);
    });

    it("applies exact canonical relation attraction", () => {
        const result = new BarnesHutPlacementStrategy(THETA).place(
            input(["A", "B"], [10, 30], [20, 40], {
                relations: [{ sourceId: "A", targetId: "B" }],
                placementIterations: 1,
                attractionStrength: 0.1,
                repulsionStrength: 0,
            })
        );

        expect([...result.x]).toEqual([12, 28]);
        expect([...result.y]).toEqual([22, 38]);
    });

    it.each([
        [0, 0],
        [1, 1],
        [8, 8],
        [64, 64],
    ])("keeps a finite %i-node layout within bounds", (size) => {
        const ids = Array.from({ length: size }, (_value, index) => `node:${index}`);
        const x = ids.map((_id, index) => (index * 17) % 100);
        const y = ids.map((_id, index) => (index * 29) % 80);
        const result = new BarnesHutPlacementStrategy(THETA).place(input(ids, x, y));

        for (const value of result.x) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(99);
        }
        for (const value of result.y) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(79);
        }
    });

    it("rejects invalid placement data and missing relation endpoints", () => {
        const strategy = new BarnesHutPlacementStrategy(THETA);

        expect(() => strategy.place(input(["A"], [], [0]))).toThrow(RangeError);
        expect(() => strategy.place(input(["A"], [Number.NaN], [0]))).toThrow(RangeError);
        expect(() => strategy.place(input(["A"], [100], [0]))).toThrow(RangeError);
        expect(() =>
            strategy.place(input(["A"], [0], [0], { placementIterations: 1_001 }))
        ).toThrow(RangeError);
        expect(() => strategy.place(input(["A"], [0], [0], { repulsionStrength: 1.1 }))).toThrow(
            RangeError
        );
        expect(() =>
            strategy.place(
                input(["A"], [0], [0], {
                    relations: [{ sourceId: "A", targetId: "missing" }],
                })
            )
        ).toThrow("Missing position for node ID: missing");
    });

    it("validates direct tree calls without exposing partial results", () => {
        const positions = { x: new Float64Array([0]), y: new Float64Array([0]) };
        const tree = new BarnesHutTree(["A"], positions, 1, 1);

        expect(() =>
            tree.accumulateRepulsion(1, THETA, 0.25, new Float64Array(1), new Float64Array(1))
        ).toThrow(RangeError);
        expect(() =>
            tree.accumulateRepulsion(0, THETA, 0.25, new Float64Array(2), new Float64Array(1))
        ).toThrow(RangeError);
        expect(() => new BarnesHutTree(["A"], positions, 0, 1)).toThrow(RangeError);
    });
});
