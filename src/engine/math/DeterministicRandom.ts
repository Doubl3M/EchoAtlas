import { hashString, mixUint32 } from "./Hash";
import { Seed, type SeedInput } from "./Seed";

const BOOLEAN_DEFAULT_PROBABILITY = 0.5;
const FORK_NAMESPACE = 0x4b1d5eed;
const FORK_NUMBER_LABEL_NAMESPACE = 0x4e554d42;
const FORK_STRING_LABEL_NAMESPACE = 0x53545247;
const STATE_NAMESPACES = [0x9e3779b9, 0x243f6a88, 0xb7e15162, 0xdeadbeef] as const;
const UINT32_RANGE = 0x100000000;

function rotateLeft(value: number, shift: number): number {
    return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function validateFinite(value: number, name: string): void {
    if (!Number.isFinite(value)) {
        throw new RangeError(`${name} must be finite.`);
    }
}

/** Deterministic xoshiro128** pseudo-random stream with isolated, reproducible forks. */
export class DeterministicRandom {
    private readonly streamSeed: number;
    private state0: number;
    private state1: number;
    private state2: number;
    private state3: number;

    public constructor(seed: SeedInput | Seed) {
        this.streamSeed = seed instanceof Seed ? seed.value : new Seed(seed).value;
        const states: number[] = STATE_NAMESPACES.map((namespace) =>
            mixUint32(this.streamSeed, namespace)
        );

        const hasNonZeroState = states.some((state) => state !== 0);

        if (!hasNonZeroState) {
            states[0] = 1;
        }

        [this.state0, this.state1, this.state2, this.state3] = states;
    }

    public nextUint32(): number {
        const result = Math.imul(rotateLeft(Math.imul(this.state1, 5) >>> 0, 7), 9) >>> 0;
        const shifted = (this.state1 << 9) >>> 0;

        this.state2 = (this.state2 ^ this.state0) >>> 0;
        this.state3 = (this.state3 ^ this.state1) >>> 0;
        this.state1 = (this.state1 ^ this.state2) >>> 0;
        this.state0 = (this.state0 ^ this.state3) >>> 0;
        this.state2 = (this.state2 ^ shifted) >>> 0;
        this.state3 = rotateLeft(this.state3, 11);

        return result;
    }

    public nextFloat(): number {
        return this.nextUint32() / UINT32_RANGE;
    }

    public nextInt(minInclusive: number, maxExclusive: number): number {
        if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxExclusive)) {
            throw new RangeError("Integer bounds must be safe integers.");
        }

        const range = maxExclusive - minInclusive;

        if (range <= 0 || range > UINT32_RANGE) {
            throw new RangeError("Integer bounds must define a range in (0, 2^32].");
        }

        const rejectionLimit = UINT32_RANGE - (UINT32_RANGE % range);
        let value = this.nextUint32();

        // The full-period nonzero xoshiro state cycle reaches the nonempty accepted prefix.
        // Rejecting the incomplete high bucket gives every modulo remainder the same count.
        while (value >= rejectionLimit) {
            value = this.nextUint32();
        }

        return minInclusive + (value % range);
    }

    public nextRange(minInclusive: number, maxExclusive: number): number {
        validateFinite(minInclusive, "minInclusive");
        validateFinite(maxExclusive, "maxExclusive");
        const range = maxExclusive - minInclusive;

        if (range <= 0 || !Number.isFinite(range)) {
            throw new RangeError("Range bounds must define a finite, positive interval.");
        }

        return minInclusive + this.nextFloat() * range;
    }

    public nextBoolean(probability: number = BOOLEAN_DEFAULT_PROBABILITY): boolean {
        if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
            throw new RangeError("Probability must be in [0, 1].");
        }

        return this.nextFloat() < probability;
    }

    /**
     * Creates a named stream from the initial seed and label, independent of parent progress.
     * Numeric and textual labels use separate namespaces.
     */
    public fork(label: string | number): DeterministicRandom {
        const isTextLabel = typeof label === "string";
        const labelNamespace = isTextLabel
            ? FORK_STRING_LABEL_NAMESPACE
            : FORK_NUMBER_LABEL_NAMESPACE;
        const labelSeed = isTextLabel ? hashString(label) : new Seed(label).value;

        return new DeterministicRandom(
            mixUint32(this.streamSeed, FORK_NAMESPACE, labelNamespace, labelSeed)
        );
    }
}
