import type { Camera2D } from "../engine/camera";
import { hashString, hashToFloat } from "../engine/math";
import { WorldTerrainMapping, type GeographicWorld } from "../world";

import {
    layoutLabels,
    type LabelCandidate,
    type LabelDescriptor,
    type PositionedLabel,
} from "./LabelLayout";
import type { RenderSurface } from "./RenderSurface";
import type { ElevationBand, VisualTheme } from "./VisualTheme";

export type LabelProvider = (knowledgeNodeId: string) => LabelDescriptor | undefined;

export interface RenderFrameSummary {
    readonly visibleLabelCount: number;
    readonly visibleKnowledgeNodeIds: readonly string[];
}

interface RenderPlan {
    readonly labels: readonly PositionedLabel[];
    readonly visibleKnowledgeNodeIds: ReadonlySet<string>;
}

function identityLabel(knowledgeNodeId: string): LabelDescriptor {
    return { text: knowledgeNodeId, priority: 0, minZoom: 0 };
}

/** Stateless layered rendering of a GeographicWorld through Camera2D. */
export class CanvasRenderer {
    private readonly theme: VisualTheme;
    private readonly fallbackTerrainColor: string;
    private readonly labelProvider: LabelProvider;

    public constructor(theme: VisualTheme, labelProvider: LabelProvider = identityLabel) {
        const finalBand = CanvasRenderer.validateTerrainBands(theme);
        this.theme = theme;
        this.fallbackTerrainColor = finalBand.color;
        this.labelProvider = labelProvider;
    }

    public render(
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface
    ): RenderFrameSummary {
        this.renderBackground(surface);
        this.renderTerrain(world, camera, surface);
        const plan = this.createRenderPlan(world, camera, surface);
        this.renderConnections(world, camera, surface, plan.visibleKnowledgeNodeIds);
        this.renderLocations(world, camera, surface, plan.visibleKnowledgeNodeIds);
        this.renderLabels(plan.labels, surface);
        return Object.freeze({
            visibleLabelCount: plan.labels.length,
            visibleKnowledgeNodeIds: Object.freeze(
                plan.labels.map(({ knowledgeNodeId }) => knowledgeNodeId)
            ),
        });
    }

    private renderBackground(surface: RenderSurface): void {
        surface.fillRect(0, 0, surface.width, surface.height, this.theme.backgroundColor);
        const texture = this.theme.backgroundTexture;
        if (!texture.enabled) {
            return;
        }
        for (let y = 0; y < surface.height; y += texture.spacing) {
            for (let x = 0; x < surface.width; x += texture.spacing) {
                const offsetX = ((x * 17 + y * 31) % texture.spacing) / 3;
                const offsetY = ((x * 29 + y * 13) % texture.spacing) / 3;
                surface.fillRect(
                    x + offsetX,
                    y + offsetY,
                    texture.size,
                    texture.size,
                    texture.color
                );
            }
        }
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
                const overlap = this.theme.terrain.cellOverlap;
                surface.fillRect(
                    topLeft.x - overlap,
                    topLeft.y - overlap,
                    bottomRight.x - topLeft.x + overlap * 2,
                    bottomRight.y - topLeft.y + overlap * 2,
                    this.terrainColor(heightField.get(x, y))
                );
            }
        }
        this.renderTerrainContours(world, camera, surface);
    }

    private renderTerrainContours(
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface
    ): void {
        const style = this.theme.terrain.contour;
        if (!style.enabled) {
            return;
        }
        const heightField = world.heightField;
        const mapping = new WorldTerrainMapping(
            world.width,
            world.height,
            heightField.width,
            heightField.height
        );
        for (let y = 0; y < heightField.height; y += 1) {
            for (let x = 0; x < heightField.width; x += 1) {
                const band = this.terrainBandIndex(heightField.get(x, y));
                const bounds = mapping.terrainCellToWorldBounds(x, y);
                if (
                    x + 1 < heightField.width &&
                    band !== this.terrainBandIndex(heightField.get(x + 1, y))
                ) {
                    const start = camera.worldToScreen(bounds.x1, bounds.y0);
                    const end = camera.worldToScreen(bounds.x1, bounds.y1);
                    surface.strokeLine(
                        start.x,
                        start.y,
                        end.x,
                        end.y,
                        style.color,
                        style.width,
                        style.opacity
                    );
                }
                if (
                    y + 1 < heightField.height &&
                    band !== this.terrainBandIndex(heightField.get(x, y + 1))
                ) {
                    const start = camera.worldToScreen(bounds.x0, bounds.y1);
                    const end = camera.worldToScreen(bounds.x1, bounds.y1);
                    surface.strokeLine(
                        start.x,
                        start.y,
                        end.x,
                        end.y,
                        style.color,
                        style.width,
                        style.opacity
                    );
                }
            }
        }
    }

    private renderConnections(
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface,
        visibleKnowledgeNodeIds: ReadonlySet<string>
    ): void {
        for (const connection of world.getConnections()) {
            if (
                !visibleKnowledgeNodeIds.has(connection.sourceKnowledgeNodeId) ||
                !visibleKnowledgeNodeIds.has(connection.targetKnowledgeNodeId)
            ) {
                continue;
            }
            const source = world.getLocationByKnowledgeNodeId(connection.sourceKnowledgeNodeId);
            const target = world.getLocationByKnowledgeNodeId(connection.targetKnowledgeNodeId);
            if (source === undefined || target === undefined) {
                throw new Error(`Connection ${connection.knowledgeRelationId} has no location.`);
            }
            const start = camera.worldToScreen(source.x, source.y);
            const end = camera.worldToScreen(target.x, target.y);
            const control = this.connectionControl(
                connection.knowledgeRelationId,
                start.x,
                start.y,
                end.x,
                end.y
            );
            if (this.theme.connection.casingWidth > 0) {
                this.strokeConnection(surface, start, control, end, true);
            }
            this.strokeConnection(surface, start, control, end, false);
        }
    }

    private renderLocations(
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface,
        visibleKnowledgeNodeIds: ReadonlySet<string>
    ): void {
        for (const location of world.getLocations()) {
            if (!visibleKnowledgeNodeIds.has(location.knowledgeNodeId)) {
                continue;
            }
            const point = camera.worldToScreen(location.x, location.y);
            surface.fillCircle(
                point.x,
                point.y,
                this.theme.location.radius,
                this.theme.location.fillColor,
                this.theme.location.strokeColor,
                this.theme.location.strokeWidth
            );
            if (this.theme.location.centerRadius > 0) {
                surface.fillCircle(
                    point.x,
                    point.y,
                    this.theme.location.centerRadius,
                    this.theme.location.centerColor,
                    this.theme.location.centerColor,
                    0
                );
            }
        }
    }

    private createRenderPlan(
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface
    ): RenderPlan {
        if (!this.theme.label.enabled || camera.getZoom() < this.theme.label.minZoom) {
            return { labels: [], visibleKnowledgeNodeIds: new Set() };
        }
        const candidates: LabelCandidate[] = [];
        for (const location of world.getLocations()) {
            const descriptor =
                this.labelProvider(location.knowledgeNodeId) ??
                identityLabel(location.knowledgeNodeId);
            if (camera.getZoom() < descriptor.minZoom) {
                continue;
            }
            const marker = camera.worldToScreen(location.x, location.y);
            candidates.push({
                knowledgeNodeId: location.knowledgeNodeId,
                descriptor,
                markerX: marker.x,
                markerY: marker.y,
            });
        }
        const worldTopLeft = camera.worldToScreen(0, 0);
        const worldBottomRight = camera.worldToScreen(world.width, world.height);
        const labels = layoutLabels(
            candidates,
            this.theme.label,
            {
                left: Math.max(0, Math.min(worldTopLeft.x, worldBottomRight.x)),
                top: Math.max(0, Math.min(worldTopLeft.y, worldBottomRight.y)),
                right: Math.min(surface.width, Math.max(worldTopLeft.x, worldBottomRight.x)),
                bottom: Math.min(surface.height, Math.max(worldTopLeft.y, worldBottomRight.y)),
            },
            surface
        );
        return {
            labels,
            visibleKnowledgeNodeIds: new Set(labels.map(({ knowledgeNodeId }) => knowledgeNodeId)),
        };
    }

    private renderLabels(labels: readonly PositionedLabel[], surface: RenderSurface): void {
        for (const label of labels) {
            surface.fillText(
                label.descriptor.text,
                label.x,
                label.y,
                this.theme.label.color,
                this.theme.label.font,
                this.theme.label.haloColor,
                this.theme.label.haloWidth
            );
        }
    }

    private connectionControl(
        connectionId: string,
        startX: number,
        startY: number,
        endX: number,
        endY: number
    ): { readonly x: number; readonly y: number } {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (length === 0 || this.theme.connection.curveStrength === 0) {
            return { x: startX, y: startY };
        }
        const direction = hashToFloat(hashString(connectionId)) < 0.5 ? -1 : 1;
        const bend = this.theme.connection.curveStrength * direction;
        return {
            x: (startX + endX) / 2 + (-deltaY / length) * bend,
            y: (startY + endY) / 2 + (deltaX / length) * bend,
        };
    }

    private strokeConnection(
        surface: RenderSurface,
        start: { readonly x: number; readonly y: number },
        control: { readonly x: number; readonly y: number },
        end: { readonly x: number; readonly y: number },
        casing: boolean
    ): void {
        const style = this.theme.connection;
        const color = casing ? style.casingColor : style.color;
        const width = casing ? style.casingWidth : style.width;
        const opacity = casing ? style.casingOpacity : style.opacity;
        if (style.curveStrength === 0) {
            surface.strokeLine(start.x, start.y, end.x, end.y, color, width, opacity);
            return;
        }
        surface.strokeQuadraticCurve(
            start.x,
            start.y,
            control.x,
            control.y,
            end.x,
            end.y,
            color,
            width,
            opacity
        );
    }

    private terrainColor(elevation: number): string {
        return (
            this.theme.terrainBands[this.terrainBandIndex(elevation)]?.color ??
            this.fallbackTerrainColor
        );
    }

    private terrainBandIndex(elevation: number): number {
        const index = this.theme.terrainBands.findIndex((band) => elevation <= band.maximum);
        return index === -1 ? this.theme.terrainBands.length - 1 : index;
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
