import { hashCoordinate2D, hashToFloat } from "./Hash";
import { lerp, smootherstep } from "./Interpolation";
import { Seed, type SeedInput } from "./Seed";

/** Stateless lattice value noise with deterministic smootherstep interpolation. */
export class ValueNoise2D {
    private readonly seed: number;

    public constructor(seed: SeedInput | Seed) {
        this.seed = seed instanceof Seed ? seed.value : new Seed(seed).value;
    }

    public sample(x: number, y: number): number {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new RangeError("Noise coordinates must be finite.");
        }

        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const top = lerp(
            this.latticeValue(x0, y0),
            this.latticeValue(x1, y0),
            smootherstep(0, 1, x - x0)
        );
        const bottom = lerp(
            this.latticeValue(x0, y1),
            this.latticeValue(x1, y1),
            smootherstep(0, 1, x - x0)
        );

        return lerp(top, bottom, smootherstep(0, 1, y - y0));
    }

    private latticeValue(x: number, y: number): number {
        return hashToFloat(hashCoordinate2D(x, y, this.seed));
    }
}
