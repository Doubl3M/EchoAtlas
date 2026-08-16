import type { GeographicFeatureId } from "./GeographicFeature";
import { validateGeographicIdentifier } from "./GeographicIdentifier";

export type GeographicAppearanceCondition = "normal" | "ruined";

export interface GeographicFeatureAppearanceOptions {
    readonly featureId: GeographicFeatureId;
    readonly condition: Exclude<GeographicAppearanceCondition, "normal">;
}

/** Immutable non-default appearance attached to an existing geographic identity. */
export class GeographicFeatureAppearance {
    public readonly featureId: GeographicFeatureId;
    public readonly condition: Exclude<GeographicAppearanceCondition, "normal">;

    public constructor(options: GeographicFeatureAppearanceOptions) {
        validateGeographicIdentifier(options.featureId, "Appearance geographic feature ID");
        if (options.condition !== "ruined") {
            throw new TypeError(
                `Unsupported geographic appearance condition: ${String(options.condition)}`
            );
        }
        this.featureId = options.featureId;
        this.condition = options.condition;
        Object.freeze(this);
    }
}
