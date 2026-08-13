import type { GeographicFeatureId } from "./GeographicFeature";
import { validateGeographicIdentifier } from "./GeographicIdentifier";

export type GeographicContentId = string;

export interface GeographicContentOptions {
    readonly id: GeographicContentId;
    readonly knowledgeNodeId: string;
    readonly containerFeatureId: GeographicFeatureId;
}

/** Immutable Knowledge identity represented as content of a spatial feature. */
export class GeographicContent {
    public readonly id: GeographicContentId;
    public readonly knowledgeNodeId: string;
    public readonly containerFeatureId: GeographicFeatureId;

    public constructor(options: GeographicContentOptions) {
        validateGeographicIdentifier(options.id, "Geographic content ID");
        validateGeographicIdentifier(options.knowledgeNodeId, "Content Knowledge Node ID");
        validateGeographicIdentifier(options.containerFeatureId, "Content container feature ID");

        this.id = options.id;
        this.knowledgeNodeId = options.knowledgeNodeId;
        this.containerFeatureId = options.containerFeatureId;
        Object.freeze(this);
    }
}
