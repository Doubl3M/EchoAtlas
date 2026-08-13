import { Seed, type SeedInput } from "../engine/math";

import {
    isSupportedGeographicLayoutGenerationVersion,
    type GeographicLayoutGenerationVersion,
} from "./GeographicLayoutGenerationVersion";

export interface GeographicLayoutGeneratorConfigOptions {
    readonly generationVersion: GeographicLayoutGenerationVersion;
    readonly seed: SeedInput | Seed;
    readonly width: number;
    readonly height: number;
}

/** Immutable explicit inputs for deterministic hierarchical layout generation. */
export class GeographicLayoutGeneratorConfig {
    public readonly generationVersion: GeographicLayoutGenerationVersion;
    public readonly seed: Seed;
    public readonly width: number;
    public readonly height: number;

    public constructor(options: GeographicLayoutGeneratorConfigOptions) {
        if (!isSupportedGeographicLayoutGenerationVersion(options.generationVersion)) {
            throw new RangeError("Unsupported geographic layout generation version.");
        }
        validateDimension(options.width, "width");
        validateDimension(options.height, "height");

        this.generationVersion = options.generationVersion;
        this.seed = new Seed(options.seed instanceof Seed ? options.seed.value : options.seed);
        Object.freeze(this.seed);
        this.width = options.width;
        this.height = options.height;
        Object.freeze(this);
    }
}

function validateDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(`Geographic layout generator ${name} must be finite and positive.`);
    }
}
