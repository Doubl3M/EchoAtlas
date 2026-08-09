import type { HeightField } from "../engine/terrain";

import type { RenderRaster } from "./RenderSurface";
import type { ElevationBand } from "./VisualTheme";

export interface TerrainRasterModel {
    readonly raster: RenderRaster;
    readonly elevations: Float64Array;
    readonly boundaries: readonly TerrainRasterBoundary[];
}

export interface TerrainRasterBoundary {
    readonly startX: number;
    readonly startY: number;
    readonly endX: number;
    readonly endY: number;
    readonly shoreline: boolean;
}

/** Builds a visual-only bilinear elevation raster without changing World geography. */
export function createTerrainRaster(
    heightField: HeightField,
    scale: number,
    bands: readonly ElevationBand[],
    waterMaximum: number
): TerrainRasterModel {
    const width = heightField.width * scale;
    const height = heightField.height * scale;
    const elevations = new Float64Array(width * height);
    const colors = new Array<string>(width * height);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const elevation = sampleBilinear(
                heightField,
                (x + 0.5) / scale - 0.5,
                (y + 0.5) / scale - 0.5
            );
            const index = y * width + x;
            elevations[index] = elevation;
            colors[index] = colorForElevation(elevation, bands);
        }
    }
    const raster = Object.freeze({ width, height, colors: Object.freeze(colors) });
    const boundaries = createBoundaries(elevations, width, height, bands, waterMaximum);
    return Object.freeze({ raster, elevations, boundaries });
}

function createBoundaries(
    elevations: Float64Array,
    width: number,
    height: number,
    bands: readonly ElevationBand[],
    waterMaximum: number
): readonly TerrainRasterBoundary[] {
    const boundaries: TerrainRasterBoundary[] = [];
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const elevation = elevations[y * width + x] ?? 0;
            if (x + 1 < width) {
                appendBoundary(
                    boundaries,
                    elevation,
                    elevations[y * width + x + 1] ?? elevation,
                    (x + 1) / width,
                    y / height,
                    (x + 1) / width,
                    (y + 1) / height,
                    bands,
                    waterMaximum
                );
            }
            if (y + 1 < height) {
                appendBoundary(
                    boundaries,
                    elevation,
                    elevations[(y + 1) * width + x] ?? elevation,
                    x / width,
                    (y + 1) / height,
                    (x + 1) / width,
                    (y + 1) / height,
                    bands,
                    waterMaximum
                );
            }
        }
    }
    return Object.freeze(boundaries.map((boundary) => Object.freeze(boundary)));
}

function appendBoundary(
    boundaries: TerrainRasterBoundary[],
    first: number,
    second: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    bands: readonly ElevationBand[],
    waterMaximum: number
): void {
    const shoreline = first <= waterMaximum !== second <= waterMaximum;
    if (shoreline || bandIndex(first, bands) !== bandIndex(second, bands)) {
        boundaries.push({ startX, startY, endX, endY, shoreline });
    }
}

function bandIndex(elevation: number, bands: readonly ElevationBand[]): number {
    const index = bands.findIndex((band) => elevation <= band.maximum);
    return index === -1 ? bands.length - 1 : index;
}

function sampleBilinear(heightField: HeightField, x: number, y: number): number {
    const boundedX = Math.max(0, Math.min(heightField.width - 1, x));
    const boundedY = Math.max(0, Math.min(heightField.height - 1, y));
    const x0 = Math.floor(boundedX);
    const y0 = Math.floor(boundedY);
    const x1 = Math.min(heightField.width - 1, x0 + 1);
    const y1 = Math.min(heightField.height - 1, y0 + 1);
    const blendX = boundedX - x0;
    const blendY = boundedY - y0;
    const top = heightField.get(x0, y0) * (1 - blendX) + heightField.get(x1, y0) * blendX;
    const bottom = heightField.get(x0, y1) * (1 - blendX) + heightField.get(x1, y1) * blendX;
    return top * (1 - blendY) + bottom * blendY;
}

function colorForElevation(elevation: number, bands: readonly ElevationBand[]): string {
    return (
        bands.find((band) => elevation <= band.maximum)?.color ??
        bands[bands.length - 1]?.color ??
        "transparent"
    );
}
