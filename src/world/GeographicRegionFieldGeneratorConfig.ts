import { Seed, type SeedInput } from "../engine/math";

import {
    isSupportedGeographicRegionFieldGenerationVersion,
    type GeographicRegionFieldGenerationVersion,
} from "./GeographicRegionFieldGenerationVersion";

export interface GeographicRegionFieldGeneratorConfigOptions {
    readonly generationVersion: GeographicRegionFieldGenerationVersion;
    readonly seed: SeedInput | Seed;
    readonly columns: number;
    readonly rows: number;
}

/** Immutable explicit inputs for deterministic territorial field generation. */
export class GeographicRegionFieldGeneratorConfig {
    public readonly generationVersion: GeographicRegionFieldGenerationVersion;
    public readonly seed: Seed;
    public readonly columns: number;
    public readonly rows: number;

    public constructor(options: GeographicRegionFieldGeneratorConfigOptions) {
        if (!isSupportedGeographicRegionFieldGenerationVersion(options.generationVersion)) {
            throw new RangeError("Unsupported geographic region field generation version.");
        }
        validateResolution(options.columns, "columns");
        validateResolution(options.rows, "rows");
        const cellCount = options.columns * options.rows;
        if (!Number.isSafeInteger(cellCount)) {
            throw new RangeError("Geographic region field cell count must be a safe integer.");
        }

        this.generationVersion = options.generationVersion;
        this.seed = new Seed(options.seed instanceof Seed ? options.seed.value : options.seed);
        Object.freeze(this.seed);
        this.columns = options.columns;
        this.rows = options.rows;
        Object.freeze(this);
    }
}

function validateResolution(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new RangeError(`Geographic region field ${name} must be a positive safe integer.`);
    }
}
