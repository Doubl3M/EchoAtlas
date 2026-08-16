import { GeographicFeatureAppearance } from "./GeographicFeatureAppearance";
import type { GeographicFeatureId } from "./GeographicFeature";
import type { GeographicHierarchy } from "./GeographicHierarchy";
import { validateGeographicIdentifier } from "./GeographicIdentifier";

export interface GeographicAppearanceSnapshotOptions {
    readonly hierarchy: GeographicHierarchy;
    readonly appearances?: readonly GeographicFeatureAppearance[];
}

/** Immutable sparse appearance snapshot; a missing entry has the default normal condition. */
export class GeographicAppearanceSnapshot {
    private readonly appearances: readonly GeographicFeatureAppearance[];
    private readonly appearancesByFeatureId: ReadonlyMap<
        GeographicFeatureId,
        GeographicFeatureAppearance
    >;

    public constructor(options: GeographicAppearanceSnapshotOptions) {
        const appearances = [...(options.appearances ?? [])].sort(compareByFeatureId);
        const appearancesByFeatureId = new Map<GeographicFeatureId, GeographicFeatureAppearance>();
        for (const appearance of appearances) {
            if (!(appearance instanceof GeographicFeatureAppearance)) {
                throw new TypeError(
                    "Geographic appearance snapshots require GeographicFeatureAppearance values."
                );
            }
            if (options.hierarchy.getFeatureById(appearance.featureId) === undefined) {
                throw new Error(
                    `Unknown appearance geographic feature ID: ${appearance.featureId}`
                );
            }
            if (appearancesByFeatureId.has(appearance.featureId)) {
                throw new Error(`Duplicate geographic appearance: ${appearance.featureId}`);
            }
            appearancesByFeatureId.set(appearance.featureId, appearance);
        }

        this.appearances = Object.freeze(appearances);
        this.appearancesByFeatureId = appearancesByFeatureId;
        Object.freeze(this);
    }

    public getAppearance(featureId: GeographicFeatureId): GeographicFeatureAppearance | undefined {
        validateGeographicIdentifier(featureId, "Appearance geographic feature ID");
        return this.appearancesByFeatureId.get(featureId);
    }

    public getAppearances(): readonly GeographicFeatureAppearance[] {
        return Object.freeze([...this.appearances]);
    }
}

function compareByFeatureId(
    left: GeographicFeatureAppearance,
    right: GeographicFeatureAppearance
): number {
    return left.featureId < right.featureId ? -1 : left.featureId > right.featureId ? 1 : 0;
}
