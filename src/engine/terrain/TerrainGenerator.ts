import { Seed, type SeedInput, ValueNoise2D } from "../math";

import { HeightField } from "./HeightField";
import { TerrainConfig } from "./TerrainConfig";

/** Stateless deterministic generation of normalized height fields. */
export class TerrainGenerator {
    public generate(seed: SeedInput | Seed, config: TerrainConfig): HeightField {
        const noise = new ValueNoise2D(seed);
        const values = new Float64Array(config.width * config.height);
        let index = 0;

        for (let y = 0; y < config.height; y += 1) {
            for (let x = 0; x < config.width; x += 1) {
                values[index] = this.sampleFractalNoise(noise, config, x, y);
                index += 1;
            }
        }

        return new HeightField(config.width, config.height, values);
    }

    private sampleFractalNoise(
        noise: ValueNoise2D,
        config: TerrainConfig,
        x: number,
        y: number
    ): number {
        let amplitude = 1;
        let amplitudeSum = 0;
        let frequency = config.baseFrequency;
        let valueSum = 0;

        for (let octave = 0; octave < config.octaves; octave += 1) {
            const sampleX = (x + config.offsetX) * frequency;
            const sampleY = (y + config.offsetY) * frequency;
            valueSum += noise.sample(sampleX, sampleY) * amplitude;
            amplitudeSum += amplitude;
            frequency *= config.lacunarity;
            amplitude *= config.persistence;
        }

        return valueSum / amplitudeSum;
    }
}
