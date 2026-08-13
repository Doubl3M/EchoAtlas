import { hashString, mixUint32 } from "../engine/math";

import type { GeographicFeature, GeographicFeatureId } from "./GeographicFeature";
import type { GeographicHierarchy } from "./GeographicHierarchy";
import {
    GeographicLayout,
    type GeographicBounds,
    type GeographicPlacement,
    type GeographicPoint,
} from "./GeographicLayout";
import type { GeographicLayoutGeneratorConfig } from "./GeographicLayoutGeneratorConfig";

type GeometryKind = "region" | "site";

/** Deterministically generates a complete hierarchical Region/Site layout. */
export class GeographicLayoutGenerator {
    public constructor(private readonly config: GeographicLayoutGeneratorConfig) {
        Object.freeze(this);
    }

    public generate(hierarchy: GeographicHierarchy): GeographicLayout {
        const features = hierarchy.getFeatures();
        if (features.length === 0) {
            return this.createLayout(hierarchy, []);
        }

        const geometryByFeatureId = this.mapGeometry(features);
        const roots = features.filter(({ parentId }) => parentId === undefined);
        if (roots.some((root) => geometryByFeatureId.get(root.id) !== "region")) {
            throw new Error("geographic-layout-v1 does not support Site root features.");
        }
        this.validateChildGeometry(hierarchy, geometryByFeatureId);

        const weights = this.computeSpatialWeights(hierarchy, geometryByFeatureId);
        const placements: GeographicPlacement[] = [];
        this.partitionRegions(
            hierarchy,
            this.seededOrder(roots, "layout:roots"),
            { x0: 0, y0: 0, x1: this.config.width, y1: this.config.height },
            "layout:roots",
            weights,
            geometryByFeatureId,
            placements
        );
        return this.createLayout(hierarchy, placements);
    }

    private createLayout(
        hierarchy: GeographicHierarchy,
        placements: readonly GeographicPlacement[]
    ): GeographicLayout {
        return new GeographicLayout({
            hierarchy,
            width: this.config.width,
            height: this.config.height,
            placements,
        });
    }

    private mapGeometry(
        features: readonly GeographicFeature[]
    ): ReadonlyMap<GeographicFeatureId, GeometryKind> {
        const result = new Map<GeographicFeatureId, GeometryKind>();
        for (const feature of features) {
            if (feature.role === "continent" || feature.role === "district") {
                result.set(feature.id, "region");
            } else if (feature.role === "building") {
                result.set(feature.id, "site");
            } else {
                throw new Error(
                    `Unsupported geographic role for geographic-layout-v1: ${String(feature.role)}`
                );
            }
        }
        return result;
    }

    private validateChildGeometry(
        hierarchy: GeographicHierarchy,
        geometryByFeatureId: ReadonlyMap<GeographicFeatureId, GeometryKind>
    ): void {
        for (const parent of hierarchy.getFeatures()) {
            const childKinds = new Set(
                hierarchy.getChildren(parent.id).map((child) => geometryByFeatureId.get(child.id))
            );
            if (childKinds.has("region") && childKinds.has("site")) {
                throw new Error(
                    `geographic-layout-v1 does not support mixed Region and Site children: ${parent.id}`
                );
            }
        }
    }

    private computeSpatialWeights(
        hierarchy: GeographicHierarchy,
        geometryByFeatureId: ReadonlyMap<GeographicFeatureId, GeometryKind>
    ): ReadonlyMap<GeographicFeatureId, number> {
        const weights = new Map<GeographicFeatureId, number>();
        const siteCounts = new Map<GeographicFeatureId, number>();
        const visit = (feature: GeographicFeature): number => {
            const cached = siteCounts.get(feature.id);
            if (cached !== undefined) return cached;
            if (geometryByFeatureId.get(feature.id) === "site") {
                siteCounts.set(feature.id, 1);
                weights.set(feature.id, 1);
                return 1;
            }
            let siteDescendants = 0;
            for (const child of hierarchy.getChildren(feature.id)) {
                siteDescendants += visit(child);
            }
            siteCounts.set(feature.id, siteDescendants);
            weights.set(feature.id, Math.max(1, siteDescendants));
            return siteDescendants;
        };
        for (const feature of hierarchy.getFeatures()) visit(feature);
        return weights;
    }

    private partitionRegions(
        hierarchy: GeographicHierarchy,
        regions: readonly GeographicFeature[],
        bounds: GeographicBounds,
        scopeId: string,
        weights: ReadonlyMap<GeographicFeatureId, number>,
        geometryByFeatureId: ReadonlyMap<GeographicFeatureId, GeometryKind>,
        placements: GeographicPlacement[]
    ): void {
        if (regions.length === 0) return;
        if (regions.length === 1) {
            this.placeRegion(
                hierarchy,
                regions[0] as GeographicFeature,
                bounds,
                weights,
                geometryByFeatureId,
                placements
            );
            return;
        }

        const splitIndex = balancedSplitIndex(regions, weights);
        const first = regions.slice(0, splitIndex);
        const second = regions.slice(splitIndex);
        const firstWeight = sumWeights(first, weights);
        const totalWeight = firstWeight + sumWeights(second, weights);
        const ratio = firstWeight / totalWeight;
        const [firstBounds, secondBounds] = this.splitBounds(bounds, ratio, scopeId);
        this.partitionRegions(
            hierarchy,
            first,
            firstBounds,
            `${scopeId}:0`,
            weights,
            geometryByFeatureId,
            placements
        );
        this.partitionRegions(
            hierarchy,
            second,
            secondBounds,
            `${scopeId}:1`,
            weights,
            geometryByFeatureId,
            placements
        );
    }

    private placeRegion(
        hierarchy: GeographicHierarchy,
        region: GeographicFeature,
        bounds: GeographicBounds,
        weights: ReadonlyMap<GeographicFeatureId, number>,
        geometryByFeatureId: ReadonlyMap<GeographicFeatureId, GeometryKind>,
        placements: GeographicPlacement[]
    ): void {
        placements.push({
            kind: "region",
            featureId: region.id,
            bounds,
            anchor: center(bounds),
        });
        const children = hierarchy.getChildren(region.id);
        if (children.length === 0) return;
        const childKind = geometryByFeatureId.get(children[0]?.id ?? "");
        if (childKind === "region") {
            this.partitionRegions(
                hierarchy,
                this.seededOrder(children, region.id),
                bounds,
                region.id,
                weights,
                geometryByFeatureId,
                placements
            );
            return;
        }
        if (childKind === "site") {
            this.placeSites(this.seededOrder(children, region.id), bounds, placements);
        }
    }

    private placeSites(
        sites: readonly GeographicFeature[],
        bounds: GeographicBounds,
        placements: GeographicPlacement[]
    ): void {
        const width = bounds.x1 - bounds.x0;
        const height = bounds.y1 - bounds.y0;
        const columns = Math.min(
            sites.length,
            Math.max(1, Math.ceil(Math.sqrt((sites.length * width) / height)))
        );
        const rows = Math.ceil(sites.length / columns);
        const cellWidth = width / columns;
        const cellHeight = height / rows;
        for (let index = 0; index < sites.length; index += 1) {
            const column = index % columns;
            const row = Math.floor(index / columns);
            placements.push({
                kind: "site",
                featureId: (sites[index] as GeographicFeature).id,
                position: {
                    x: bounds.x0 + (column + 0.5) * cellWidth,
                    y: bounds.y0 + (row + 0.5) * cellHeight,
                },
            });
        }
    }

    private seededOrder(
        features: readonly GeographicFeature[],
        scopeId: string
    ): readonly GeographicFeature[] {
        const scopeHash = hashString(scopeId);
        return [...features].sort((left, right) => {
            const leftRank = mixUint32(this.config.seed.value, scopeHash, hashString(left.id));
            const rightRank = mixUint32(this.config.seed.value, scopeHash, hashString(right.id));
            return leftRank - rightRank || compareText(left.id, right.id);
        });
    }

    private splitBounds(
        bounds: GeographicBounds,
        ratio: number,
        scopeId: string
    ): readonly [GeographicBounds, GeographicBounds] {
        const width = bounds.x1 - bounds.x0;
        const height = bounds.y1 - bounds.y0;
        const splitHorizontally =
            width > height ||
            (width === height &&
                (mixUint32(this.config.seed.value, hashString(scopeId)) & 1) === 0);
        if (splitHorizontally) {
            const split = bounds.x0 + width * ratio;
            return [
                { ...bounds, x1: split },
                { ...bounds, x0: split },
            ];
        }
        const split = bounds.y0 + height * ratio;
        return [
            { ...bounds, y1: split },
            { ...bounds, y0: split },
        ];
    }
}

function balancedSplitIndex(
    regions: readonly GeographicFeature[],
    weights: ReadonlyMap<GeographicFeatureId, number>
): number {
    const total = sumWeights(regions, weights);
    let prefix = 0;
    let bestIndex = 1;
    let bestDifference = Number.POSITIVE_INFINITY;
    for (let index = 1; index < regions.length; index += 1) {
        prefix += weightOf(regions[index - 1] as GeographicFeature, weights);
        const difference = Math.abs(total - 2 * prefix);
        if (difference < bestDifference) {
            bestDifference = difference;
            bestIndex = index;
        }
    }
    return bestIndex;
}

function sumWeights(
    features: readonly GeographicFeature[],
    weights: ReadonlyMap<GeographicFeatureId, number>
): number {
    return features.reduce((sum, feature) => sum + weightOf(feature, weights), 0);
}

function weightOf(
    feature: GeographicFeature,
    weights: ReadonlyMap<GeographicFeatureId, number>
): number {
    const weight = weights.get(feature.id);
    if (weight === undefined) throw new Error(`Missing spatial weight: ${feature.id}`);
    return weight;
}

function center(bounds: GeographicBounds): GeographicPoint {
    return { x: (bounds.x0 + bounds.x1) / 2, y: (bounds.y0 + bounds.y1) / 2 };
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
