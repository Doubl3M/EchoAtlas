import { TerrainConfig } from "../engine/terrain";
import { WorldConfig } from "../world";

export const DEMO_WORLD_WIDTH = 96;
export const DEMO_WORLD_HEIGHT = 64;

/** Shared deterministic showcase geography configuration. */
export function createDemoWorldConfig(): WorldConfig {
    return new WorldConfig({
        generationVersion: "world-v1-exact",
        width: DEMO_WORLD_WIDTH,
        height: DEMO_WORLD_HEIGHT,
        placementIterations: 32,
        attractionStrength: 0.018,
        repulsionStrength: 0.42,
        terrain: new TerrainConfig({
            width: 192,
            height: 128,
            baseFrequency: 0.022,
            octaves: 5,
            persistence: 0.58,
            lacunarity: 2,
            offsetX: -18,
            offsetY: -11,
        }),
    });
}
