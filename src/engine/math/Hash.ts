const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const MIX_FIRST_MULTIPLIER = 0x85ebca6b;
const MIX_SECOND_MULTIPLIER = 0xc2b2ae35;
const UINT32_MAX = 0xffffffff;
const UINT32_RANGE = 0x100000000;

function assertUint32(value: number, name: string): void {
    if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
        throw new RangeError(`${name} must be an unsigned 32-bit integer.`);
    }
}

function avalanche(value: number): number {
    let mixed = value >>> 0;
    mixed = Math.imul(mixed ^ (mixed >>> 16), MIX_FIRST_MULTIPLIER) >>> 0;
    mixed = Math.imul(mixed ^ (mixed >>> 13), MIX_SECOND_MULTIPLIER) >>> 0;
    return (mixed ^ (mixed >>> 16)) >>> 0;
}

/** Hashes a JavaScript string as UTF-16 code units using deterministic FNV-1a mixing. */
export function hashString(value: string): number {
    let hash = FNV_OFFSET_BASIS;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }

    return avalanche(hash);
}

/** Combines one or more uint32 values and applies a platform-stable avalanche. */
export function mixUint32(...values: readonly number[]): number {
    if (values.length === 0) {
        throw new RangeError("At least one value is required.");
    }

    let hash = FNV_OFFSET_BASIS;

    for (const value of values) {
        assertUint32(value, "value");
        hash = Math.imul(hash ^ value, FNV_PRIME) >>> 0;
    }

    return avalanche(hash);
}

/** Hashes signed integer lattice coordinates with a uint32 seed. */
export function hashCoordinate2D(x: number, y: number, seed: number): number {
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
        throw new RangeError("Coordinates must be safe integers.");
    }

    assertUint32(seed, "seed");
    return mixUint32(seed, x >>> 0, y >>> 0);
}

/** Maps a uint32 hash uniformly onto the half-open interval [0, 1). */
export function hashToFloat(hash: number): number {
    assertUint32(hash, "hash");
    return hash / UINT32_RANGE;
}
