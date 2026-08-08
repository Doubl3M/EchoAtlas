import { DeterministicRandom, type Seed, type SeedInput } from "../engine/math";

import type { IndexedWorldPositions } from "./WorldPlacementStrategy";

/** Creates the canonical initial coordinates shared by World placement physics. */
export function createWorldInitialPositions(
    seed: SeedInput | Seed,
    nodeIds: readonly string[],
    width: number,
    height: number
): IndexedWorldPositions {
    const x = new Float64Array(nodeIds.length);
    const y = new Float64Array(nodeIds.length);
    const random = new DeterministicRandom(seed);
    for (let index = 0; index < nodeIds.length; index += 1) {
        const nodeRandom = random.fork(`world-location:${nodeIds[index]}`);
        x[index] = randomCoordinate(nodeRandom, width);
        y[index] = randomCoordinate(nodeRandom, height);
    }
    return { x, y };
}

function randomCoordinate(random: DeterministicRandom, size: number): number {
    return size === 1 ? 0 : random.nextRange(0, size - 1);
}
