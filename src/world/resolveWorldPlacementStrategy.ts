import { ExactIndexedPlacementStrategy } from "./ExactIndexedPlacementStrategy";
import type { WorldGenerationVersion } from "./WorldGenerationVersion";
import type { WorldPlacementStrategy } from "./WorldPlacementStrategy";

/** Resolves validated generation physics without fallback or size-dependent policy. */
export function resolveWorldPlacementStrategy(
    version: WorldGenerationVersion
): WorldPlacementStrategy {
    switch (version) {
        case "world-v1-exact":
            return new ExactIndexedPlacementStrategy();
    }
}
