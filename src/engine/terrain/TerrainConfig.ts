const MAX_OCTAVES = 16;
export const MAX_HEIGHT_FIELD_LENGTH = 0xffffffff;

export interface TerrainConfigOptions {
    readonly width: number;
    readonly height: number;
    readonly baseFrequency: number;
    readonly octaves: number;
    readonly persistence: number;
    readonly lacunarity: number;
    readonly offsetX: number;
    readonly offsetY: number;
}

function validateDimension(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new RangeError(`${name} must be a positive safe integer.`);
    }
}

function validateFinite(value: number, name: string): void {
    if (!Number.isFinite(value)) {
        throw new RangeError(`${name} must be finite.`);
    }
}

/** Immutable, validated parameters for deterministic height-field generation. */
export class TerrainConfig {
    public readonly width: number;
    public readonly height: number;
    public readonly baseFrequency: number;
    public readonly octaves: number;
    public readonly persistence: number;
    public readonly lacunarity: number;
    public readonly offsetX: number;
    public readonly offsetY: number;

    public constructor(options: TerrainConfigOptions) {
        validateDimension(options.width, "width");
        validateDimension(options.height, "height");
        this.validateHeightFieldLength(options.width, options.height);
        this.validateNoiseParameters(options);

        this.width = options.width;
        this.height = options.height;
        this.baseFrequency = options.baseFrequency;
        this.octaves = options.octaves;
        this.persistence = options.persistence;
        this.lacunarity = options.lacunarity;
        this.offsetX = options.offsetX;
        this.offsetY = options.offsetY;

        Object.freeze(this);
    }

    private validateNoiseParameters(options: TerrainConfigOptions): void {
        validateFinite(options.baseFrequency, "baseFrequency");
        validateFinite(options.persistence, "persistence");
        validateFinite(options.lacunarity, "lacunarity");
        validateFinite(options.offsetX, "offsetX");
        validateFinite(options.offsetY, "offsetY");

        if (options.baseFrequency <= 0) {
            throw new RangeError("baseFrequency must be greater than zero.");
        }

        if (
            !Number.isInteger(options.octaves) ||
            options.octaves < 1 ||
            options.octaves > MAX_OCTAVES
        ) {
            throw new RangeError(`octaves must be an integer in [1, ${MAX_OCTAVES}].`);
        }

        // Positive, non-increasing amplitudes keep every octave normalized and bounded.
        if (options.persistence <= 0 || options.persistence > 1) {
            throw new RangeError("persistence must be in (0, 1].");
        }

        // Strict growth makes each successive octave a higher spatial frequency.
        if (options.lacunarity <= 1) {
            throw new RangeError("lacunarity must be greater than one.");
        }

        this.validateSamplingDomain(options);
    }

    private validateHeightFieldLength(width: number, height: number): void {
        const length = width * height;

        if (!Number.isSafeInteger(length) || length > MAX_HEIGHT_FIELD_LENGTH) {
            throw new RangeError("Dimensions exceed the supported Float64Array length.");
        }
    }

    private validateSamplingDomain(options: TerrainConfigOptions): void {
        const maximumX = Math.max(
            Math.abs(options.offsetX),
            Math.abs(options.offsetX + options.width - 1)
        );
        const maximumY = Math.max(
            Math.abs(options.offsetY),
            Math.abs(options.offsetY + options.height - 1)
        );
        let frequency = options.baseFrequency;

        for (let octave = 0; octave < options.octaves; octave += 1) {
            const maximumCoordinate = Math.max(maximumX * frequency, maximumY * frequency);

            if (!Number.isSafeInteger(Math.floor(maximumCoordinate) + 1)) {
                throw new RangeError("Configuration exceeds the safe noise sampling domain.");
            }

            frequency *= options.lacunarity;
        }
    }
}
