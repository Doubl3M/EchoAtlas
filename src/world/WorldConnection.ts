export interface WorldConnectionOptions {
    readonly knowledgeRelationId: string;
    readonly sourceKnowledgeNodeId: string;
    readonly targetKnowledgeNodeId: string;
}

/** Immutable directed geographic representation of one Knowledge Graph relation. */
export class WorldConnection {
    public readonly knowledgeRelationId: string;
    public readonly sourceKnowledgeNodeId: string;
    public readonly targetKnowledgeNodeId: string;

    public constructor(options: WorldConnectionOptions) {
        WorldConnection.validateId(options.knowledgeRelationId, "knowledgeRelationId");
        WorldConnection.validateId(options.sourceKnowledgeNodeId, "sourceKnowledgeNodeId");
        WorldConnection.validateId(options.targetKnowledgeNodeId, "targetKnowledgeNodeId");

        this.knowledgeRelationId = options.knowledgeRelationId;
        this.sourceKnowledgeNodeId = options.sourceKnowledgeNodeId;
        this.targetKnowledgeNodeId = options.targetKnowledgeNodeId;
        Object.freeze(this);
    }

    private static validateId(id: string, name: string): void {
        if (typeof id !== "string" || id.length === 0 || id.trim() !== id) {
            throw new TypeError(`${name} must be non-empty and have no surrounding whitespace.`);
        }
    }
}
