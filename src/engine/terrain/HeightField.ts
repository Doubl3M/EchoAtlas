import { MAX_HEIGHT_FIELD_LENGTH } from "./TerrainConfig";

function validateDimension(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new RangeError(`${name} must be a positive safe integer.`);
    }
}

/** Immutable rectangular values stored contiguously in row-major order: index = y * width + x. */
export class HeightField {
    public readonly width: number;
    public readonly height: number;
    private readonly values: Float64Array;

    public constructor(width: number, height: number, values: ArrayLike<number>) {
        validateDimension(width, "width");
        validateDimension(height, "height");
        const length = width * height;

        if (!Number.isSafeInteger(length) || length > MAX_HEIGHT_FIELD_LENGTH) {
            throw new RangeError("Dimensions exceed the supported Float64Array length.");
        }

        if (values.length !== length) {
            throw new RangeError("Values must match the height-field dimensions.");
        }

        const copy = Float64Array.from(values);

        for (const value of copy) {
            if (!Number.isFinite(value) || value < 0 || value > 1) {
                throw new RangeError("Height values must be finite and in [0, 1].");
            }
        }

        this.width = width;
        this.height = height;
        this.values = copy;
        Object.freeze(this);
    }

    public get(x: number, y: number): number {
        if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
            throw new RangeError("Height-field coordinates must be safe integers.");
        }

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new RangeError("Height-field coordinates are out of bounds.");
        }

        return this.values[y * this.width + x];
    }

    /** Returns a mutable copy in the same row-major order; internal storage remains isolated. */
    public toArray(): number[] {
        return Array.from(this.values);
    }
}
