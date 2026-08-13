import type { GeographicContentId } from "./GeographicContent";
import type { GeographicFeature, GeographicFeatureId } from "./GeographicFeature";
import type { GeographicHierarchy } from "./GeographicHierarchy";

export type GeographicFocusRepresentationKind = "direct-feature" | "content-container";

export interface GeographicFocusTarget {
    readonly knowledgeNodeId: string;
    readonly featureId: GeographicFeatureId;
    readonly representationKind: GeographicFocusRepresentationKind;
    readonly contentId?: GeographicContentId;
}

/** Resolves Knowledge identities to generic geographic representations without spatial geometry. */
export class GeographicFocusResolver {
    private static readonly emptyTargets: readonly GeographicFocusTarget[] = Object.freeze([]);

    public constructor(private readonly hierarchy: GeographicHierarchy) {
        Object.freeze(this);
    }

    /** Returns every representation in canonical geographic identity order. */
    public resolveFocusTargets(knowledgeNodeId: string): readonly GeographicFocusTarget[] {
        const targets: GeographicFocusTarget[] = [];

        for (const feature of this.hierarchy.getFeaturesByKnowledgeNodeId(knowledgeNodeId)) {
            targets.push(
                Object.freeze({
                    knowledgeNodeId,
                    featureId: feature.id,
                    representationKind: "direct-feature" as const,
                })
            );
        }
        for (const content of this.hierarchy.getContentsByKnowledgeNodeId(knowledgeNodeId)) {
            targets.push(
                Object.freeze({
                    knowledgeNodeId,
                    featureId: content.containerFeatureId,
                    representationKind: "content-container" as const,
                    contentId: content.id,
                })
            );
        }

        if (targets.length === 0) {
            return GeographicFocusResolver.emptyTargets;
        }
        return Object.freeze(targets.sort(compareTargets));
    }

    /**
     * Chooses the hierarchically closest target to an optional context.
     * Without context, canonical order is only a stable fallback and carries no product meaning.
     */
    public chooseFocusTarget(
        targets: readonly GeographicFocusTarget[],
        contextFeatureId?: GeographicFeatureId
    ): GeographicFocusTarget | undefined {
        if (targets.length === 0) {
            if (contextFeatureId !== undefined) {
                this.requireFeature(contextFeatureId, "context");
            }
            return undefined;
        }

        const candidates = [...targets].sort(compareTargets);
        for (const target of candidates) {
            this.requireFeature(target.featureId, "focus target");
        }
        if (contextFeatureId === undefined) {
            return candidates[0];
        }

        const contextPath = this.pathFromRoot(this.requireFeature(contextFeatureId, "context"));
        candidates.sort((left, right) => {
            const leftMetric = proximityMetric(
                contextPath,
                this.pathFromRoot(this.requireFeature(left.featureId, "focus target"))
            );
            const rightMetric = proximityMetric(
                contextPath,
                this.pathFromRoot(this.requireFeature(right.featureId, "focus target"))
            );
            return (
                rightMetric.commonDepth - leftMetric.commonDepth ||
                leftMetric.distance - rightMetric.distance ||
                compareTargets(left, right)
            );
        });
        return candidates[0];
    }

    private requireFeature(featureId: GeographicFeatureId, role: string): GeographicFeature {
        const feature = this.hierarchy.getFeatureById(featureId);
        if (feature === undefined) {
            throw new Error(`Unknown geographic ${role} feature ID: ${featureId}`);
        }
        return feature;
    }

    private pathFromRoot(feature: GeographicFeature): readonly GeographicFeatureId[] {
        const reversedPath: GeographicFeatureId[] = [];
        let current: GeographicFeature | undefined = feature;
        while (current !== undefined) {
            reversedPath.push(current.id);
            current = this.hierarchy.getParent(current.id);
        }
        return reversedPath.reverse();
    }
}

function proximityMetric(
    contextPath: readonly GeographicFeatureId[],
    candidatePath: readonly GeographicFeatureId[]
): Readonly<{ commonDepth: number; distance: number }> {
    const sharedLimit = Math.min(contextPath.length, candidatePath.length);
    let commonDepth = 0;
    while (commonDepth < sharedLimit && contextPath[commonDepth] === candidatePath[commonDepth]) {
        commonDepth += 1;
    }
    return {
        commonDepth,
        distance: contextPath.length + candidatePath.length - 2 * commonDepth,
    };
}

function compareTargets(left: GeographicFocusTarget, right: GeographicFocusTarget): number {
    return (
        compareText(left.featureId, right.featureId) ||
        compareText(left.representationKind, right.representationKind) ||
        compareText(left.contentId ?? "", right.contentId ?? "") ||
        compareText(left.knowledgeNodeId, right.knowledgeNodeId)
    );
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
