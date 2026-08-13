import { validateGeographicIdentifier } from "./GeographicIdentifier";

export type GeographicFeatureId = string;

export const geographicRoles = ["continent", "district", "building"] as const;

export type GeographicRole = (typeof geographicRoles)[number];

export interface GeographicFeatureOptions {
    readonly id: GeographicFeatureId;
    readonly role: GeographicRole;
    readonly parentId?: GeographicFeatureId;
    readonly sourceKnowledgeNodeId?: string;
}

/** Immutable identity and containment metadata for a spatial geographic feature. */
export class GeographicFeature {
    public readonly id: GeographicFeatureId;
    public readonly role: GeographicRole;
    public readonly parentId: GeographicFeatureId | undefined;
    public readonly sourceKnowledgeNodeId: string | undefined;

    public constructor(options: GeographicFeatureOptions) {
        validateGeographicIdentifier(options.id, "Geographic feature ID");
        if (!geographicRoles.includes(options.role)) {
            throw new TypeError(`Unsupported geographic role: ${String(options.role)}`);
        }
        if (options.parentId !== undefined) {
            validateGeographicIdentifier(options.parentId, "Parent geographic feature ID");
        }
        if (options.sourceKnowledgeNodeId !== undefined) {
            validateGeographicIdentifier(options.sourceKnowledgeNodeId, "Source Knowledge Node ID");
        }

        this.id = options.id;
        this.role = options.role;
        this.parentId = options.parentId;
        this.sourceKnowledgeNodeId = options.sourceKnowledgeNodeId;
        Object.freeze(this);
    }
}
