import type { GeographicContentId } from "./GeographicContent";
import type {
    GeographicFocusRepresentationKind,
    GeographicFocusTarget,
} from "./GeographicFocusResolver";
import type { GeographicFeatureId } from "./GeographicFeature";
import type { GeographicLayout } from "./GeographicLayout";

export interface GeographicSpatialFocus {
    readonly featureId: GeographicFeatureId;
    readonly representationKind: GeographicFocusRepresentationKind;
    readonly contentId?: GeographicContentId;
    readonly x: number;
    readonly y: number;
}

/** Resolves a semantic geographic target to one logical World point, without Camera policy. */
export function resolveGeographicSpatialFocus(
    target: GeographicFocusTarget,
    layout: GeographicLayout
): GeographicSpatialFocus {
    const placement = layout.getPlacementByFeatureId(target.featureId);
    if (placement === undefined) {
        throw new Error(`Unknown spatial focus feature ID: ${target.featureId}`);
    }
    const point = placement.kind === "region" ? placement.anchor : placement.position;
    return Object.freeze({
        featureId: target.featureId,
        representationKind: target.representationKind,
        ...(target.contentId === undefined ? {} : { contentId: target.contentId }),
        x: point.x,
        y: point.y,
    });
}
