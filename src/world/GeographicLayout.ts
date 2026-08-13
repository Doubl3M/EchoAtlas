import type { GeographicFeatureId } from "./GeographicFeature";
import type { GeographicHierarchy } from "./GeographicHierarchy";

export interface GeographicPoint {
    readonly x: number;
    readonly y: number;
}

/** Axis-aligned spatial envelope; it is not a rendered geographic border. */
export interface GeographicBounds {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
}

export interface GeographicRegionPlacement {
    readonly kind: "region";
    readonly featureId: GeographicFeatureId;
    readonly bounds: GeographicBounds;
    readonly anchor: GeographicPoint;
}

export interface GeographicSitePlacement {
    readonly kind: "site";
    readonly featureId: GeographicFeatureId;
    readonly position: GeographicPoint;
}

export type GeographicPlacement = GeographicRegionPlacement | GeographicSitePlacement;

export interface GeographicLayoutOptions {
    readonly hierarchy: GeographicHierarchy;
    readonly width: number;
    readonly height: number;
    readonly placements?: readonly GeographicPlacement[];
}

/** Immutable, complete spatial snapshot for the features of a GeographicHierarchy. */
export class GeographicLayout {
    private static readonly emptyPlacements: readonly GeographicPlacement[] = Object.freeze([]);

    public readonly width: number;
    public readonly height: number;
    private readonly placements: readonly GeographicPlacement[];
    private readonly placementsByFeatureId: ReadonlyMap<GeographicFeatureId, GeographicPlacement>;

    public constructor(options: GeographicLayoutOptions) {
        validateDimension(options.width, "width");
        validateDimension(options.height, "height");

        this.width = options.width;
        this.height = options.height;
        this.placements = this.copyPlacements(options.placements ?? []);
        this.placementsByFeatureId = this.indexPlacements(this.placements, options.hierarchy);
        this.validateCompleteness(options.hierarchy);
        this.validateContainment(options.hierarchy);
        Object.freeze(this);
    }

    public getPlacements(): readonly GeographicPlacement[] {
        return this.placements.length === 0 ? GeographicLayout.emptyPlacements : this.placements;
    }

    public getPlacementByFeatureId(
        featureId: GeographicFeatureId
    ): GeographicPlacement | undefined {
        return this.placementsByFeatureId.get(featureId);
    }

    public getRegionPlacementByFeatureId(
        featureId: GeographicFeatureId
    ): GeographicRegionPlacement | undefined {
        const placement = this.placementsByFeatureId.get(featureId);
        return placement?.kind === "region" ? placement : undefined;
    }

    public getSitePlacementByFeatureId(
        featureId: GeographicFeatureId
    ): GeographicSitePlacement | undefined {
        const placement = this.placementsByFeatureId.get(featureId);
        return placement?.kind === "site" ? placement : undefined;
    }

    private copyPlacements(
        placements: readonly GeographicPlacement[]
    ): readonly GeographicPlacement[] {
        return Object.freeze(
            placements
                .map((placement) => this.copyPlacement(placement))
                .sort((left, right) => compareText(left.featureId, right.featureId))
        );
    }

    private copyPlacement(placement: GeographicPlacement): GeographicPlacement {
        if (placement.kind === "region") {
            const bounds = Object.freeze({ ...placement.bounds });
            const anchor = Object.freeze({ ...placement.anchor });
            this.validateRegion(bounds, anchor, placement.featureId);
            return Object.freeze({
                kind: "region" as const,
                featureId: placement.featureId,
                bounds,
                anchor,
            });
        }
        if (placement.kind === "site") {
            const position = Object.freeze({ ...placement.position });
            validatePoint(position, `Site ${placement.featureId}`);
            this.validatePointInWorld(position, `Site ${placement.featureId}`);
            return Object.freeze({
                kind: "site" as const,
                featureId: placement.featureId,
                position,
            });
        }
        throw new TypeError(
            `Unsupported geographic placement kind: ${String((placement as { kind: unknown }).kind)}`
        );
    }

    private validateRegion(
        bounds: GeographicBounds,
        anchor: GeographicPoint,
        featureId: GeographicFeatureId
    ): void {
        for (const [name, value] of [
            ["x0", bounds.x0],
            ["y0", bounds.y0],
            ["x1", bounds.x1],
            ["y1", bounds.y1],
        ] as const) {
            if (!Number.isFinite(value)) {
                throw new RangeError(`Region ${featureId} ${name} must be finite.`);
            }
        }
        if (bounds.x1 <= bounds.x0 || bounds.y1 <= bounds.y0) {
            throw new RangeError(`Region ${featureId} bounds must have positive width and height.`);
        }
        if (bounds.x0 < 0 || bounds.y0 < 0 || bounds.x1 > this.width || bounds.y1 > this.height) {
            throw new RangeError(`Region ${featureId} bounds must be inside the World extent.`);
        }
        validatePoint(anchor, `Region ${featureId} anchor`);
        if (!containsPoint(bounds, anchor)) {
            throw new RangeError(`Region ${featureId} anchor must be inside its bounds.`);
        }
    }

    private validatePointInWorld(point: GeographicPoint, description: string): void {
        if (point.x < 0 || point.x > this.width || point.y < 0 || point.y > this.height) {
            throw new RangeError(`${description} position must be inside the World extent.`);
        }
    }

    private indexPlacements(
        placements: readonly GeographicPlacement[],
        hierarchy: GeographicHierarchy
    ): ReadonlyMap<GeographicFeatureId, GeographicPlacement> {
        const index = new Map<GeographicFeatureId, GeographicPlacement>();
        for (const placement of placements) {
            if (hierarchy.getFeatureById(placement.featureId) === undefined) {
                throw new Error(`Unknown geographic placement feature ID: ${placement.featureId}`);
            }
            if (index.has(placement.featureId)) {
                throw new Error(
                    `Duplicate geographic placement feature ID: ${placement.featureId}`
                );
            }
            index.set(placement.featureId, placement);
        }
        return index;
    }

    private validateCompleteness(hierarchy: GeographicHierarchy): void {
        for (const feature of hierarchy.getFeatures()) {
            if (!this.placementsByFeatureId.has(feature.id)) {
                throw new Error(`Missing geographic placement for feature ID: ${feature.id}`);
            }
        }
    }

    private validateContainment(hierarchy: GeographicHierarchy): void {
        for (const feature of hierarchy.getFeatures()) {
            if (feature.parentId === undefined) {
                continue;
            }
            const parent = this.placementsByFeatureId.get(feature.parentId);
            const child = this.placementsByFeatureId.get(feature.id);
            if (parent?.kind !== "region") {
                throw new Error(
                    `Geographic parent placement must be a Region: ${feature.parentId}`
                );
            }
            if (child?.kind === "region" && !containsBounds(parent.bounds, child.bounds)) {
                throw new Error(`Geographic Region must be contained by its parent: ${feature.id}`);
            }
            if (child?.kind === "site" && !containsPoint(parent.bounds, child.position)) {
                throw new Error(`Geographic Site must be contained by its parent: ${feature.id}`);
            }
        }
    }
}

function validateDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(`Geographic layout ${name} must be finite and greater than zero.`);
    }
}

function validatePoint(point: GeographicPoint, description: string): void {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        throw new RangeError(`${description} coordinates must be finite.`);
    }
}

function containsPoint(bounds: GeographicBounds, point: GeographicPoint): boolean {
    return (
        point.x >= bounds.x0 && point.x <= bounds.x1 && point.y >= bounds.y0 && point.y <= bounds.y1
    );
}

function containsBounds(parent: GeographicBounds, child: GeographicBounds): boolean {
    return (
        child.x0 >= parent.x0 &&
        child.y0 >= parent.y0 &&
        child.x1 <= parent.x1 &&
        child.y1 <= parent.y1
    );
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
