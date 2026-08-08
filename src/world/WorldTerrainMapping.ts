export interface TerrainCellIndex {
    readonly x: number;
    readonly y: number;
}

export interface WorldCellBounds {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
}

/**
 * Pure mapping between a logical World extent and a terrain cell grid.
 *
 * WorldLocations remain in [0, worldSize - 1]. With a finer Terrain, cells nearest the visual
 * boundary at worldSize can therefore be rendered without being sampled by a WorldLocation.
 */
export class WorldTerrainMapping {
    public constructor(
        private readonly worldWidth: number,
        private readonly worldHeight: number,
        private readonly terrainWidth: number,
        private readonly terrainHeight: number
    ) {
        WorldTerrainMapping.validateDimension(worldWidth, "worldWidth");
        WorldTerrainMapping.validateDimension(worldHeight, "worldHeight");
        WorldTerrainMapping.validateDimension(terrainWidth, "terrainWidth");
        WorldTerrainMapping.validateDimension(terrainHeight, "terrainHeight");
        Object.freeze(this);
    }

    public worldToTerrainCell(x: number, y: number): TerrainCellIndex {
        this.validateWorldCoordinate(x, this.worldWidth, "x");
        this.validateWorldCoordinate(y, this.worldHeight, "y");
        return Object.freeze({
            x: WorldTerrainMapping.containingCell(x, this.worldWidth, this.terrainWidth),
            y: WorldTerrainMapping.containingCell(y, this.worldHeight, this.terrainHeight),
        });
    }

    public terrainCellToWorldBounds(x: number, y: number): WorldCellBounds {
        WorldTerrainMapping.validateCellIndex(x, this.terrainWidth, "x");
        WorldTerrainMapping.validateCellIndex(y, this.terrainHeight, "y");
        return Object.freeze({
            x0: (x * this.worldWidth) / this.terrainWidth,
            y0: (y * this.worldHeight) / this.terrainHeight,
            x1: ((x + 1) * this.worldWidth) / this.terrainWidth,
            y1: ((y + 1) * this.worldHeight) / this.terrainHeight,
        });
    }

    private static containingCell(
        coordinate: number,
        worldDimension: number,
        terrainDimension: number
    ): number {
        return Math.min(
            terrainDimension - 1,
            Math.floor((coordinate * terrainDimension) / worldDimension)
        );
    }

    private static validateDimension(value: number, name: string): void {
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new RangeError(`${name} must be a positive safe integer.`);
        }
    }

    private static validateCellIndex(value: number, dimension: number, name: string): void {
        if (!Number.isSafeInteger(value) || value < 0 || value >= dimension) {
            throw new RangeError(`${name} must be a terrain cell index in [0, ${dimension - 1}].`);
        }
    }

    private validateWorldCoordinate(value: number, dimension: number, name: string): void {
        if (!Number.isFinite(value) || value < 0 || value > dimension) {
            throw new RangeError(`${name} must be finite and in [0, ${dimension}].`);
        }
    }
}
