import { TerrainConfig } from "../engine/terrain";

const MAX_PLACEMENT_ITERATIONS = 1_000;

export interface WorldConfigOptions {
    readonly width: number;
    readonly height: number;
    readonly placementIterations: number;
    readonly attractionStrength: number;
    readonly repulsionStrength: number;
    readonly terrain: TerrainConfig;
}

/** Immutable parameters for deterministic geographic generation. */
export class WorldConfig {
    public readonly width: number;
    public readonly height: number;
    public readonly placementIterations: number;
    public readonly attractionStrength: number;
    public readonly repulsionStrength: number;
    public readonly terrain: TerrainConfig;

    public constructor(options: WorldConfigOptions) {
        WorldConfig.validateDimension(options.width, "width");
        WorldConfig.validateDimension(options.height, "height");
        WorldConfig.validateIterations(options.placementIterations);
        WorldConfig.validateStrength(options.attractionStrength, "attractionStrength");
        WorldConfig.validateStrength(options.repulsionStrength, "repulsionStrength");

        if (options.terrain.width !== options.width || options.terrain.height !== options.height) {
            throw new RangeError("Terrain dimensions must match the world dimensions.");
        }

        this.width = options.width;
        this.height = options.height;
        this.placementIterations = options.placementIterations;
        this.attractionStrength = options.attractionStrength;
        this.repulsionStrength = options.repulsionStrength;
        this.terrain = options.terrain;
        Object.freeze(this);
    }

    private static validateDimension(value: number, name: string): void {
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new RangeError(`${name} must be a positive safe integer.`);
        }
    }

    private static validateIterations(value: number): void {
        if (!Number.isInteger(value) || value < 0 || value > MAX_PLACEMENT_ITERATIONS) {
            throw new RangeError(
                `placementIterations must be an integer in [0, ${MAX_PLACEMENT_ITERATIONS}].`
            );
        }
    }

    private static validateStrength(value: number, name: string): void {
        if (!Number.isFinite(value) || value < 0 || value > 1) {
            throw new RangeError(`${name} must be finite and in [0, 1].`);
        }
    }
}
