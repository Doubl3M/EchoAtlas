import type { Camera2D } from "../engine/camera";
import { hashCoordinate2D, hashString, hashToFloat, mixUint32 } from "../engine/math";
import type { HeightField } from "../engine/terrain";
import { type GeographicWorld } from "../world";

import {
    layoutLabels,
    type LabelCandidate,
    type LabelDescriptor,
    type PositionedLabel,
} from "./LabelLayout";
import type { RenderSurface } from "./RenderSurface";
import { createTerrainRaster, type TerrainRasterModel } from "./TerrainRaster";
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
    private readonly labelProvider: LabelProvider;
    private readonly terrainRasters = new WeakMap<HeightField, TerrainRasterModel>();

    public constructor(theme: VisualTheme, labelProvider: LabelProvider = identityLabel) {
        CanvasRenderer.validateTerrainBands(theme);
        CanvasRenderer.validateTerrainStyle(theme);
        this.theme = theme;
        this.labelProvider = labelProvider;
    }

    public render(
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface,
        focusedKnowledgeNodeId?: string
    ): RenderFrameSummary {
        this.renderBackground(surface);
        this.renderTerrain(world, camera, surface);
        const plan = this.createRenderPlan(world, camera, surface, focusedKnowledgeNodeId);
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
        const model = this.terrainRaster(world.heightField);
        const topLeft = camera.worldToScreen(0, 0);
        const bottomRight = camera.worldToScreen(world.width, world.height);
        const overlap = this.theme.terrain.cellOverlap;
        surface.drawRaster(
            model.raster,
            topLeft.x - overlap,
            topLeft.y - overlap,
            bottomRight.x - topLeft.x + overlap * 2,
            bottomRight.y - topLeft.y + overlap * 2
        );
        this.renderTerrainContours(model, world, camera, surface);
        this.renderTerrainOrnaments(world, camera, surface);
    }

    private renderTerrainContours(
        model: TerrainRasterModel,
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface
    ): void {
        if (
            !this.theme.terrain.contour.enabled &&
            this.theme.terrain.water.shorelineOpacity === 0
        ) {
            return;
        }
        for (const boundary of model.boundaries) {
            this.renderTerrainBoundary(
                boundary.shoreline,
                boundary.startX * world.width,
                boundary.startY * world.height,
                boundary.endX * world.width,
                boundary.endY * world.height,
                camera,
                surface
            );
        }
    }

    private renderTerrainBoundary(
        shoreline: boolean,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        camera: Camera2D,
        surface: RenderSurface
    ): void {
        const start = camera.worldToScreen(startX, startY);
        const end = camera.worldToScreen(endX, endY);
        if (shoreline) {
            const style = this.theme.terrain.water;
            surface.strokeLine(
                start.x,
                start.y,
                end.x,
                end.y,
                style.shorelineColor,
                style.shorelineWidth,
                style.shorelineOpacity
            );
        } else if (this.theme.terrain.contour.enabled) {
            const style = this.theme.terrain.contour;
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

    private renderTerrainOrnaments(
        world: GeographicWorld,
        camera: Camera2D,
        surface: RenderSurface
    ): void {
        const style = this.theme.terrain.ornaments;
        if (!style.enabled) {
            return;
        }
        const field = world.heightField;
        for (let y = Math.floor(style.spacing / 2); y < field.height; y += style.spacing) {
            for (let x = Math.floor(style.spacing / 2); x < field.width; x += style.spacing) {
                if (hashToFloat(hashCoordinate2D(x, y, 0x70a71a5)) >= style.density) {
                    continue;
                }
                const elevation = field.get(x, y);
                const point = camera.worldToScreen(
                    ((x + 0.5) / field.width) * world.width,
                    ((y + 0.5) / field.height) * world.height
                );
                if (elevation <= this.theme.terrain.water.maximum) {
                    this.renderWaterMark(point.x, point.y, surface);
                } else if (elevation >= style.reliefMinimum) {
                    this.renderReliefMark(point.x, point.y, surface);
                }
            }
        }
    }

    private renderWaterMark(x: number, y: number, surface: RenderSurface): void {
        const style = this.theme.terrain.ornaments;
        surface.strokeQuadraticCurve(
            x - style.size,
            y,
            x,
            y - style.size * 0.35,
            x + style.size,
            y,
            style.waterColor,
            style.width,
            style.opacity
        );
    }

    private renderReliefMark(x: number, y: number, surface: RenderSurface): void {
        const style = this.theme.terrain.ornaments;
        surface.strokeLine(
            x - style.size,
            y + style.size,
            x,
            y - style.size,
            style.reliefColor,
            style.width,
            style.opacity
        );
        surface.strokeLine(
            x,
            y - style.size,
            x + style.size,
            y + style.size,
            style.reliefColor,
            style.width,
            style.opacity
        );
    }

    private terrainRaster(heightField: HeightField): TerrainRasterModel {
        let model = this.terrainRasters.get(heightField);
        if (model === undefined) {
            model = createTerrainRaster(
                heightField,
                this.theme.terrain.rasterScale,
                this.theme.terrainBands,
                this.theme.terrain.water.maximum
            );
            this.terrainRasters.set(heightField, model);
        }
        return model;
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
            const descriptor = this.labelProvider(location.knowledgeNodeId);
            if (descriptor?.landmarkKind === "city" && this.theme.landmarks.city.enabled) {
                this.renderCityLandmark(
                    location.knowledgeNodeId,
                    point.x,
                    point.y,
                    camera.getZoom(),
                    surface
                );
                continue;
            }
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
        surface: RenderSurface,
        focusedKnowledgeNodeId: string | undefined
    ): RenderPlan {
        if (
            !this.theme.label.enabled ||
            (focusedKnowledgeNodeId === undefined && camera.getZoom() < this.theme.label.minZoom)
        ) {
            return { labels: [], visibleKnowledgeNodeIds: new Set() };
        }
        const candidates: LabelCandidate[] = [];
        for (const location of world.getLocations()) {
            const descriptor =
                this.labelProvider(location.knowledgeNodeId) ??
                identityLabel(location.knowledgeNodeId);
            const focused = location.knowledgeNodeId === focusedKnowledgeNodeId;
            if (!focused && camera.getZoom() < descriptor.minZoom) {
                continue;
            }
            const marker = camera.worldToScreen(location.x, location.y);
            candidates.push({
                knowledgeNodeId: location.knowledgeNodeId,
                descriptor: focused
                    ? Object.freeze({ ...descriptor, priority: Number.MAX_SAFE_INTEGER })
                    : descriptor,
                markerX: marker.x,
                markerY: marker.y,
                markerClearance: this.labelClearance(descriptor, camera.getZoom()),
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

    private renderCityLandmark(
        knowledgeNodeId: string,
        x: number,
        y: number,
        zoom: number,
        surface: RenderSurface
    ): void {
        const style = this.theme.landmarks.city;
        const detailed = zoom >= style.detailZoom;
        const hash = hashString(knowledgeNodeId);
        const widthVariation = detailed
            ? (hashToFloat(mixUint32(hash, 1)) * 2 - 1) * style.widthVariation
            : 0;
        const width = (detailed ? style.detailedWidth : style.compactWidth) * (1 + widthVariation);
        const height = detailed ? style.detailedHeight : style.compactHeight;
        const left = x - width / 2;
        const bottom = y + height * 0.35;
        const buildingCount = detailed ? 3 + (hash % 3) : 2;
        const dominantIndex = (hash >>> 4) % buildingCount;

        surface.fillRect(left - 3, bottom + 1.5, width + 7, 3.2, style.strokeColor);
        surface.fillRect(left - 1.5, bottom, width + 3, 2.6, style.detailColor);
        for (let index = 0; index < buildingCount; index += 1) {
            const variation = mixUint32(hash, index + 2);
            const center = left + ((index + 1) / (buildingCount + 1)) * width;
            const buildingWidth = width * (0.16 + hashToFloat(variation) * 0.08);
            const heightFactor =
                index === dominantIndex
                    ? 0.82 + hashToFloat(mixUint32(variation, 1)) * 0.12
                    : 0.38 + hashToFloat(mixUint32(variation, 2)) * 0.34;
            const buildingHeight = height * heightFactor;
            const buildingX = center - buildingWidth / 2;
            const buildingY = bottom - buildingHeight;
            const color = index % 2 === 0 ? style.fillColor : style.secondaryColor;
            this.fillOutlinedRect(
                surface,
                buildingX,
                buildingY,
                buildingWidth,
                buildingHeight,
                color
            );
            this.renderCityRoof(surface, variation % 3, buildingX, buildingY, buildingWidth, color);
            if (detailed) {
                surface.fillRect(
                    center - 0.8,
                    bottom - buildingHeight * 0.38,
                    1.6,
                    2.5,
                    style.detailColor
                );
            }
        }
        surface.strokeLine(
            left - 4,
            bottom + 4.5,
            left + width + 4,
            bottom + 4.5,
            style.strokeColor,
            style.strokeWidth,
            0.72
        );
    }

    private renderCityRoof(
        surface: RenderSurface,
        roofKind: number,
        x: number,
        y: number,
        width: number,
        color: string
    ): void {
        const style = this.theme.landmarks.city;
        if (roofKind === 0) {
            surface.fillCircle(
                x + width / 2,
                y,
                width * 0.48,
                color,
                style.strokeColor,
                style.strokeWidth
            );
            return;
        }
        if (roofKind === 1) {
            surface.strokeLine(
                x - 1,
                y,
                x + width / 2,
                y - width * 0.42,
                style.strokeColor,
                style.strokeWidth,
                1
            );
            surface.strokeLine(
                x + width / 2,
                y - width * 0.42,
                x + width + 1,
                y,
                style.strokeColor,
                style.strokeWidth,
                1
            );
            return;
        }
        this.fillOutlinedRect(
            surface,
            x + width * 0.62,
            y - width * 0.38,
            Math.max(2, width * 0.16),
            width * 0.38,
            style.secondaryColor
        );
    }

    private fillOutlinedRect(
        surface: RenderSurface,
        x: number,
        y: number,
        width: number,
        height: number,
        color: string
    ): void {
        const style = this.theme.landmarks.city;
        surface.fillRect(
            x - style.strokeWidth,
            y - style.strokeWidth,
            width + style.strokeWidth * 2,
            height + style.strokeWidth * 2,
            style.strokeColor
        );
        surface.fillRect(x, y, width, height, color);
    }

    private labelClearance(descriptor: LabelDescriptor, zoom: number): number {
        if (descriptor.landmarkKind !== "city" || !this.theme.landmarks.city.enabled) {
            return 0;
        }
        const style = this.theme.landmarks.city;
        const width =
            (zoom >= style.detailZoom ? style.detailedWidth : style.compactWidth) *
            (1 + style.widthVariation);
        return width / 2 + style.labelGap;
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

    private static validateTerrainStyle(theme: VisualTheme): void {
        const { rasterScale, water, ornaments } = theme.terrain;
        if (!Number.isInteger(rasterScale) || rasterScale < 1 || rasterScale > 8) {
            throw new RangeError("Terrain raster scale must be an integer in [1, 8].");
        }
        if (!Number.isFinite(water.maximum) || water.maximum < 0 || water.maximum > 1) {
            throw new RangeError("Terrain water maximum must be finite and in [0, 1].");
        }
        if (!Number.isInteger(ornaments.spacing) || ornaments.spacing <= 0) {
            throw new RangeError("Terrain ornament spacing must be a positive integer.");
        }
        if (!Number.isFinite(ornaments.density) || ornaments.density < 0 || ornaments.density > 1) {
            throw new RangeError("Terrain ornament density must be finite and in [0, 1].");
        }
    }
}
