export interface KnowledgeNodeOptions {
    /** Stable identity preserved exactly, with surrounding whitespace forbidden. */
    readonly id: string;
    readonly kind: string;
    /** Any finite semantic weight; the Knowledge layer imposes no arbitrary range. */
    readonly weight: number;
}

/** An immutable semantic concept with a stable, consumer-provided identity. */
export class KnowledgeNode {
    public readonly id: string;
    public readonly kind: string;
    public readonly weight: number;

    public constructor(options: KnowledgeNodeOptions) {
        KnowledgeNode.validateText(options.id, "Node ID");
        KnowledgeNode.validateText(options.kind, "Node kind");
        KnowledgeNode.validateWeight(options.weight);

        this.id = options.id;
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
            throw new RangeError("Node weight must be finite.");
        }
    }
}
