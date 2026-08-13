import { hashString, hashToFloat, mixUint32, ValueNoise2D } from "../engine/math";

import type { GeographicFeature, GeographicFeatureId } from "./GeographicFeature";
import type { GeographicHierarchy } from "./GeographicHierarchy";
import type { GeographicBounds, GeographicLayout, GeographicPoint } from "./GeographicLayout";
import { GeographicRegionField } from "./GeographicRegionField";
import type { GeographicRegionFieldGeneratorConfig } from "./GeographicRegionFieldGeneratorConfig";

interface RootLobe {
    readonly x: number;
    readonly y: number;
    readonly radiusX: number;
    readonly radiusY: number;
}

interface RootShape {
    readonly lobes: readonly RootLobe[];
    readonly noise: ValueNoise2D;
}

interface ChildTerritory {
    readonly featureId: GeographicFeatureId;
    readonly focus: GeographicPoint;
    readonly areaScale: number;
    readonly noise: ValueNoise2D;
}

/** Generates deepest-Region territorial ownership independently from Terrain and rendering. */
export class GeographicRegionFieldGenerator {
    public constructor(private readonly config: GeographicRegionFieldGeneratorConfig) {
        Object.freeze(this);
    }

    public generate(
        hierarchy: GeographicHierarchy,
        layout: GeographicLayout
    ): GeographicRegionField {
        this.validateMatchingFeatures(hierarchy, layout);
        const cellCount = this.config.columns * this.config.rows;
        const regions = hierarchy
            .getFeatures()
            .filter(({ id }) => layout.getRegionPlacementByFeatureId(id) !== undefined);
        if (regions.length === 0) {
            return this.createField(layout, new Array(cellCount).fill(undefined));
        }

        const roots = regions.filter(({ parentId }) => parentId === undefined);
        const rootByCell = this.rasterizeRootEnvelopes(layout, roots);
        const rootShapes = new Map(
            roots.map((root) => [root.id, this.createRootShape(layout, root.id)] as const)
        );
        const childrenByParent = this.createChildTerritories(hierarchy, layout, regions);
        const owners = new Array<GeographicFeatureId | undefined>(cellCount);

        for (let row = 0; row < this.config.rows; row += 1) {
            for (let column = 0; column < this.config.columns; column += 1) {
                const index = row * this.config.columns + column;
                const rootId = rootByCell[index];
                if (rootId === undefined) continue;
                const point = this.cellCenter(layout, column, row);
                const rootBounds = this.requireRegionBounds(layout, rootId);
                const rootShape = rootShapes.get(rootId);
                if (
                    rootShape === undefined ||
                    !this.isInsideRootTerritory(point, rootBounds, rootShape)
                ) {
                    continue;
                }
                owners[index] = this.resolveDeepestOwner(rootId, point, childrenByParent);
            }
        }
        return this.createField(layout, owners);
    }

    private validateMatchingFeatures(
        hierarchy: GeographicHierarchy,
        layout: GeographicLayout
    ): void {
        const features = hierarchy.getFeatures();
        if (features.length !== layout.getPlacements().length) {
            throw new Error("Geographic hierarchy and layout must contain the same features.");
        }
        for (const feature of features) {
            if (layout.getPlacementByFeatureId(feature.id) === undefined) {
                throw new Error("Geographic hierarchy and layout must contain the same features.");
            }
        }
    }

    private rasterizeRootEnvelopes(
        layout: GeographicLayout,
        roots: readonly GeographicFeature[]
    ): readonly (GeographicFeatureId | undefined)[] {
        const owners = new Array<GeographicFeatureId | undefined>(
            this.config.columns * this.config.rows
        );
        for (const root of roots) {
            const bounds = this.requireRegionBounds(layout, root.id);
            const range = this.cellRange(layout, bounds);
            for (let row = range.row0; row <= range.row1; row += 1) {
                for (let column = range.column0; column <= range.column1; column += 1) {
                    const point = this.cellCenter(layout, column, row);
                    if (!containsPoint(bounds, point)) continue;
                    const index = row * this.config.columns + column;
                    const existing = owners[index];
                    if (existing === undefined || root.id < existing) owners[index] = root.id;
                }
            }
        }
        return owners;
    }

    /**
     * Builds one connected implicit mass from a central lobe, bounded satellite lobes and bridge
     * lobes. All values are scoped by the field seed and root identity; no mutable random stream
     * or raster-order-dependent state participates in the shape.
     */
    private createRootShape(layout: GeographicLayout, rootId: GeographicFeatureId): RootShape {
        const placement = layout.getRegionPlacementByFeatureId(rootId);
        if (placement === undefined) {
            throw new Error(`Missing Region placement for territorial owner: ${rootId}`);
        }
        const bounds = placement.bounds;
        const width = bounds.x1 - bounds.x0;
        const height = bounds.y1 - bounds.y0;
        const identity = hashString(rootId);
        const centerX = (placement.anchor.x - bounds.x0) / width;
        const centerY = (placement.anchor.y - bounds.y0) / height;
        const center: RootLobe = {
            x: centerX,
            y: centerY,
            radiusX: 0.24 + this.randomUnit(identity, 0) * 0.09,
            radiusY: 0.24 + this.randomUnit(identity, 1) * 0.09,
        };
        const lobes: RootLobe[] = [center];
        const satelliteCount = 5 + Math.floor(this.randomUnit(identity, 2) * 3);
        const phase = this.randomUnit(identity, 3) * Math.PI * 2;
        for (let index = 0; index < satelliteCount; index += 1) {
            const scope = 10 + index * 8;
            const angle =
                phase +
                (index / satelliteCount) * Math.PI * 2 +
                (this.randomUnit(identity, scope) - 0.5) * 0.75;
            const distance = 0.2 + this.randomUnit(identity, scope + 1) * 0.3;
            const satelliteX = clamp(centerX + Math.cos(angle) * distance, 0.08, 0.92);
            const satelliteY = clamp(centerY + Math.sin(angle) * distance, 0.08, 0.92);
            const satellite: RootLobe = {
                x: satelliteX,
                y: satelliteY,
                radiusX: 0.17 + this.randomUnit(identity, scope + 2) * 0.15,
                radiusY: 0.17 + this.randomUnit(identity, scope + 3) * 0.15,
            };
            lobes.push(satellite, {
                x: (centerX + satelliteX) / 2,
                y: (centerY + satelliteY) / 2,
                radiusX: 0.15 + Math.abs(satelliteX - centerX) * 0.6,
                radiusY: 0.15 + Math.abs(satelliteY - centerY) * 0.6,
            });
        }
        return {
            lobes: Object.freeze(lobes),
            noise: new ValueNoise2D(mixUint32(this.config.seed.value, identity, 0x726f6f74)),
        };
    }

    private isInsideRootTerritory(
        point: GeographicPoint,
        bounds: GeographicBounds,
        shape: RootShape
    ): boolean {
        const normalizedX = (point.x - bounds.x0) / (bounds.x1 - bounds.x0);
        const normalizedY = (point.y - bounds.y0) / (bounds.y1 - bounds.y0);
        let nearestLobeDistance = Number.POSITIVE_INFINITY;
        for (const lobe of shape.lobes) {
            const dx = (normalizedX - lobe.x) / lobe.radiusX;
            const dy = (normalizedY - lobe.y) / lobe.radiusY;
            nearestLobeDistance = Math.min(nearestLobeDistance, Math.sqrt(dx * dx + dy * dy));
        }
        const coastNoise = shape.noise.sample(normalizedX * 2.15 + 3.7, normalizedY * 2.15 - 5.1);
        return nearestLobeDistance <= 0.91 + (coastNoise - 0.5) * 0.3;
    }

    private createChildTerritories(
        hierarchy: GeographicHierarchy,
        layout: GeographicLayout,
        regions: readonly GeographicFeature[]
    ): ReadonlyMap<GeographicFeatureId, readonly ChildTerritory[]> {
        const result = new Map<GeographicFeatureId, readonly ChildTerritory[]>();
        for (const parent of regions) {
            const children = hierarchy
                .getChildren(parent.id)
                .filter(({ id }) => layout.getRegionPlacementByFeatureId(id) !== undefined);
            if (children.length === 0) continue;
            const parentBounds = this.requireRegionBounds(layout, parent.id);
            const parentArea = boundsArea(parentBounds);
            result.set(
                parent.id,
                Object.freeze(
                    children.map((child) => {
                        const placement = layout.getRegionPlacementByFeatureId(child.id);
                        if (placement === undefined) {
                            throw new Error(`Missing child Region placement: ${child.id}`);
                        }
                        return {
                            featureId: child.id,
                            focus: placement.anchor,
                            areaScale: Math.sqrt(boundsArea(placement.bounds) / parentArea),
                            noise: new ValueNoise2D(
                                mixUint32(
                                    this.config.seed.value,
                                    hashString(parent.id),
                                    hashString(child.id),
                                    0x6368696c
                                )
                            ),
                        };
                    })
                )
            );
        }
        return result;
    }

    /**
     * Descends one hierarchy branch. Each level is a seeded weighted territorial partition over
     * direct children, so cost is proportional to the sum of sibling counts on that branch rather
     * than the number of all Regions in the World.
     */
    private resolveDeepestOwner(
        rootId: GeographicFeatureId,
        point: GeographicPoint,
        childrenByParent: ReadonlyMap<GeographicFeatureId, readonly ChildTerritory[]>
    ): GeographicFeatureId {
        let ownerId = rootId;
        let children = childrenByParent.get(ownerId);
        while (children !== undefined && children.length > 0) {
            ownerId = this.selectChildTerritory(point, children);
            children = childrenByParent.get(ownerId);
        }
        return ownerId;
    }

    private selectChildTerritory(
        point: GeographicPoint,
        children: readonly ChildTerritory[]
    ): GeographicFeatureId {
        let selected = children[0] as ChildTerritory;
        let selectedScore = this.territoryScore(point, selected);
        for (let index = 1; index < children.length; index += 1) {
            const child = children[index] as ChildTerritory;
            const score = this.territoryScore(point, child);
            if (
                score < selectedScore ||
                (score === selectedScore && child.featureId < selected.featureId)
            ) {
                selected = child;
                selectedScore = score;
            }
        }
        return selected.featureId;
    }

    private territoryScore(point: GeographicPoint, territory: ChildTerritory): number {
        const dx = (point.x - territory.focus.x) / territory.areaScale;
        const dy = (point.y - territory.focus.y) / territory.areaScale;
        const distance = dx * dx + dy * dy;
        const noise = territory.noise.sample(point.x * 0.0125 + 2.3, point.y * 0.0125 - 4.7);
        return distance * (0.9 + noise * 0.2);
    }

    private randomUnit(identity: number, scope: number): number {
        return hashToFloat(mixUint32(this.config.seed.value, identity, scope));
    }

    private cellRange(
        layout: GeographicLayout,
        bounds: GeographicBounds
    ): Readonly<{ column0: number; column1: number; row0: number; row1: number }> {
        return {
            column0: clampInteger(
                Math.floor((bounds.x0 * this.config.columns) / layout.width),
                0,
                this.config.columns - 1
            ),
            column1: clampInteger(
                Math.ceil((bounds.x1 * this.config.columns) / layout.width) - 1,
                0,
                this.config.columns - 1
            ),
            row0: clampInteger(
                Math.floor((bounds.y0 * this.config.rows) / layout.height),
                0,
                this.config.rows - 1
            ),
            row1: clampInteger(
                Math.ceil((bounds.y1 * this.config.rows) / layout.height) - 1,
                0,
                this.config.rows - 1
            ),
        };
    }

    private cellCenter(layout: GeographicLayout, column: number, row: number): GeographicPoint {
        return {
            x: ((column + 0.5) * layout.width) / this.config.columns,
            y: ((row + 0.5) * layout.height) / this.config.rows,
        };
    }

    private requireRegionBounds(
        layout: GeographicLayout,
        featureId: GeographicFeatureId
    ): GeographicBounds {
        const placement = layout.getRegionPlacementByFeatureId(featureId);
        if (placement === undefined) {
            throw new Error(`Missing Region placement for territorial owner: ${featureId}`);
        }
        return placement.bounds;
    }

    private createField(
        layout: GeographicLayout,
        owners: readonly (GeographicFeatureId | undefined)[]
    ): GeographicRegionField {
        return new GeographicRegionField({
            layout,
            columns: this.config.columns,
            rows: this.config.rows,
            ownerFeatureIds: owners,
        });
    }
}

function containsPoint(bounds: GeographicBounds, point: GeographicPoint): boolean {
    return (
        point.x >= bounds.x0 && point.x <= bounds.x1 && point.y >= bounds.y0 && point.y <= bounds.y1
    );
}

function boundsArea(bounds: GeographicBounds): number {
    return (bounds.x1 - bounds.x0) * (bounds.y1 - bounds.y0);
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}

function clampInteger(value: number, minimum: number, maximum: number): number {
    return Math.trunc(clamp(value, minimum, maximum));
}
