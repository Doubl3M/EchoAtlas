import type { Camera2D } from "../engine/camera";
import { WorldTerrainMapping, type GeographicWorld, type WorldLocation } from "../world";

import type { RenderSurface } from "./RenderSurface";
import type { ElevationBand, VisualTheme } from "./VisualTheme";

export type LabelProvider = (knowledgeNodeId: string) => string | undefined;

const identityLabelProvider: LabelProvider = (knowledgeNodeId) => knowledgeNodeId;

/** Stateless layered rendering of a GeographicWorld through Camera2D. */
export class CanvasRenderer {
    private readonly theme: VisualTheme;
    private readonly fallbackTerrainColor: string;
    private readonly labelProvider: LabelProvider;

    public constructor(theme: VisualTheme, labelProvider: LabelProvider = identityLabelProvider) {
        const finalBand = CanvasRenderer.validateTerrainBands(theme);
        this.theme = theme;
        this.fallbackTerrainColor = finalBand.color;
        this.labelProvider = labelProvider;
    }

    public render(world: GeographicWorld, camera: Camera2D, surface: RenderSurface): void {
        this.renderBackground(surface);
        this.renderTerrain(world, camera, surface);
        this.renderConnections(world, camera, surface);
        this.renderLocations(world, camera, surface);
        this.renderLabels(world, camera, surface);
    }

    private renderBackground(surface: RenderSurface): void {
        surface.fillRect(0, 0, surface.width, surface.height, this.theme.backgroundColor);
    }

    private renderTerrain(world: GeographicWorld, camera: Camera2D, surface: RenderSurface): void {
        const heightField = world.heightField;
        const terrainMapping = new WorldTerrainMapping(
            world.width,
            world.height,
            heightField.width,
            heightField.height
        );
        for (let y = 0; y < heightField.height; y += 1) {
            for (let x = 0; x < heightField.width; x += 1) {
                const bounds = terrainMapping.terrainCellToWorldBounds(x, y);
                const topLeft = camera.worldToScreen(bounds.x0, bounds.y0);
                const bottomRight = camera.worldToScreen(bounds.x1, bounds.y1);
                surface.fillRect(
                    topLeft.x,
                    topLeft.y,
                    bottomRight.x - topLeft.x,
                    bottomRight.y - topLeft.y,
                    this.terrainColor(heightField.get(x, y))
                );
            }
        }
    }

    private renderConnections(
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface
    ): void {
        for (const connection of world.getConnections()) {
            const source = world.getLocationByKnowledgeNodeId(connection.sourceKnowledgeNodeId);
            const target = world.getLocationByKnowledgeNodeId(connection.targetKnowledgeNodeId);
            if (source === undefined || target === undefined) {
                throw new Error(`Connection ${connection.knowledgeRelationId} has no location.`);
            }
            const start = camera.worldToScreen(source.x, source.y);
            const end = camera.worldToScreen(target.x, target.y);
            surface.strokeLine(
                start.x,
                start.y,
                end.x,
                end.y,
                this.theme.connection.color,
                this.theme.connection.width,
                this.theme.connection.opacity
            );
        }
    }

    private renderLocations(
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface
    ): void {
        for (const location of world.getLocations()) {
            const point = camera.worldToScreen(location.x, location.y);
            surface.fillCircle(
                point.x,
                point.y,
                this.theme.location.radius,
                this.theme.location.fillColor,
                this.theme.location.strokeColor,
                this.theme.location.strokeWidth
            );
        }
    }

    private renderLabels(world: GeographicWorld, camera: Camera2D, surface: RenderSurface): void {
        if (!this.theme.label.enabled || camera.getZoom() < this.theme.label.minZoom) {
            return;
        }
        for (const location of world.getLocations()) {
            this.renderLabel(location, camera, surface);
        }
    }

    private renderLabel(location: WorldLocation, camera: Camera2D, surface: RenderSurface): void {
        const label = this.labelProvider(location.knowledgeNodeId) ?? location.knowledgeNodeId;
        const point = camera.worldToScreen(location.x, location.y);
        surface.fillText(
            label,
            point.x + this.theme.label.offsetX,
            point.y + this.theme.label.offsetY,
            this.theme.label.color,
            this.theme.label.font
        );
    }

    private terrainColor(elevation: number): string {
        for (const band of this.theme.terrainBands) {
            if (elevation <= band.maximum) {
                return band.color;
            }
        }
        return this.fallbackTerrainColor;
    }

    private static validateTerrainBands(theme: VisualTheme): ElevationBand {
        let previousMaximum = -1;
        for (const band of theme.terrainBands) {
            if (!Number.isFinite(band.maximum) || band.maximum < 0 || band.maximum > 1) {
                throw new RangeError("Terrain band maxima must be finite and in [0, 1].");
            }
            if (band.maximum <= previousMaximum) {
                throw new RangeError("Terrain band maxima must be strictly increasing.");
            }
            previousMaximum = band.maximum;
        }

        const finalBand = theme.terrainBands.at(-1);
        if (finalBand === undefined || finalBand.maximum !== 1) {
            throw new RangeError("Terrain bands must cover elevations through 1.");
        }
        return finalBand;
    }
}
