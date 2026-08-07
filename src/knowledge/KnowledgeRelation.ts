export interface KnowledgeRelationOptions {
    /** Stable identity preserved exactly, with surrounding whitespace forbidden. */
    readonly id: string;
    /** Exact stable identity of the directed source node. */
    readonly sourceId: string;
    /** Exact stable identity of the directed target node. */
    readonly targetId: string;
    readonly kind: string;
    /** Any finite semantic weight; the Knowledge layer imposes no arbitrary range. */
    readonly weight: number;
}

/** An immutable, directed semantic relation with a stable identity. */
export class KnowledgeRelation {
    public readonly id: string;
    public readonly sourceId: string;
    public readonly targetId: string;
    public readonly kind: string;
    public readonly weight: number;

    public constructor(options: KnowledgeRelationOptions) {
        KnowledgeRelation.validateText(options.id, "Relation ID");
        KnowledgeRelation.validateText(options.sourceId, "Relation source ID");
        KnowledgeRelation.validateText(options.targetId, "Relation target ID");
        KnowledgeRelation.validateText(options.kind, "Relation kind");
        KnowledgeRelation.validateWeight(options.weight);

        this.id = options.id;
        this.sourceId = options.sourceId;
        this.targetId = options.targetId;
        this.kind = options.kind;
        this.weight = options.weight;
        Object.freeze(this);
    }

    private static validateText(value: string, name: string): void {
        if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
            throw new TypeError(`${name} must be non-empty and have no surrounding whitespace.`);
        }
    }

    private static validateWeight(weight: number): void {
        if (!Number.isFinite(weight)) {
            throw new RangeError("Relation weight must be finite.");
        }
    }
}
