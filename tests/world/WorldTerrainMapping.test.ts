import { describe, expect, it } from "vitest";

import { HeightField } from "../../src/engine/terrain";
import { WorldTerrainMapping } from "../../src/world";

describe("WorldTerrainMapping", () => {
    it.each([
        {
            name: "lower-resolution Terrain",
            worldSize: 8,
            terrainSize: 4,
            coordinates: [0, 1.999, 7],
            expected: [0, 0, 3],
        },
        {
            name: "1:1 Terrain",
            worldSize: 8,
            terrainSize: 8,
            coordinates: [0, 3.75, 7],
            expected: [0, 3, 7],
        },
        {
            name: "higher-resolution Terrain",
            worldSize: 4,
            terrainSize: 8,
            coordinates: [0, 1.5, 3],
            expected: [0, 3, 6],
        },
    ])("maps $name using containing cells", ({ worldSize, terrainSize, coordinates, expected }) => {
        const mapping = new WorldTerrainMapping(worldSize, 1, terrainSize, 1);

        expect(coordinates.map((x) => mapping.worldToTerrainCell(x, 0).x)).toEqual(expected);
    });

    it("maps the visual upper boundary, not every maximum WorldLocation, to the final cell", () => {
        const mapping = new WorldTerrainMapping(8, 4, 4, 2);
        const finerMapping = new WorldTerrainMapping(4, 1, 8, 1);

        expect(mapping.worldToTerrainCell(7, 3)).toEqual({ x: 3, y: 1 });
        expect(mapping.worldToTerrainCell(8, 4)).toEqual({ x: 3, y: 1 });
        expect(finerMapping.worldToTerrainCell(3, 0)).toEqual({ x: 6, y: 0 });
        expect(finerMapping.worldToTerrainCell(4, 1)).toEqual({ x: 7, y: 0 });
    });

    it("projects terrain cells to adjacent bounds covering the complete World extent", () => {
        const mapping = new WorldTerrainMapping(8, 4, 4, 2);

        expect(mapping.terrainCellToWorldBounds(0, 0)).toEqual({
            x0: 0,
            y0: 0,
            x1: 2,
            y1: 2,
        });
        expect(mapping.terrainCellToWorldBounds(1, 0).x0).toBe(
            mapping.terrainCellToWorldBounds(0, 0).x1
        );
        expect(mapping.terrainCellToWorldBounds(3, 1)).toEqual({
            x0: 6,
            y0: 2,
            x1: 8,
            y1: 4,
        });
    });

    it("supports degenerate one-dimensional extents deterministically", () => {
        const mapping = new WorldTerrainMapping(1, 1, 1, 1);

        expect(mapping.worldToTerrainCell(0, 0)).toEqual({ x: 0, y: 0 });
        expect(mapping.worldToTerrainCell(1, 1)).toEqual({ x: 0, y: 0 });
        expect(mapping.terrainCellToWorldBounds(0, 0)).toEqual({
            x0: 0,
            y0: 0,
            x1: 1,
            y1: 1,
        });
        expect(mapping.worldToTerrainCell(0.5, 0.5)).toEqual(mapping.worldToTerrainCell(0.5, 0.5));
    });

    it("allows a controlled HeightField to be sampled by multiple World positions", () => {
        const field = new HeightField(2, 1, [0.25, 0.75]);
        const mapping = new WorldTerrainMapping(8, 1, field.width, field.height);
        const elevations = [0, 1, 3.999, 4, 7, 8].map((x) => {
            const cell = mapping.worldToTerrainCell(x, 0);
            return field.get(cell.x, cell.y);
        });

        expect(elevations).toEqual([0.25, 0.25, 0.25, 0.75, 0.75, 0.75]);
    });

    it("rejects invalid dimensions, coordinates and cell indices explicitly", () => {
        expect(() => new WorldTerrainMapping(0, 1, 1, 1)).toThrow(RangeError);
        expect(() => new WorldTerrainMapping(1, 1, 1.5, 1)).toThrow(RangeError);

        const mapping = new WorldTerrainMapping(8, 4, 4, 2);
        for (const coordinate of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
            expect(() => mapping.worldToTerrainCell(coordinate, 0)).toThrow(RangeError);
        }
        expect(() => mapping.worldToTerrainCell(0, 4.1)).toThrow(RangeError);
        expect(() => mapping.terrainCellToWorldBounds(-1, 0)).toThrow(RangeError);
        expect(() => mapping.terrainCellToWorldBounds(4, 0)).toThrow(RangeError);
        expect(() => mapping.terrainCellToWorldBounds(0, 0.5)).toThrow(RangeError);
    });
});
