import { KnowledgeNode } from "./KnowledgeNode";
import { KnowledgeRelation } from "./KnowledgeRelation";

/** An immutable semantic graph snapshot with deterministic ID ordering. */
export class KnowledgeGraph {
    private readonly nodes: readonly KnowledgeNode[];
    private readonly relations: readonly KnowledgeRelation[];
    private readonly nodesById: ReadonlyMap<string, KnowledgeNode>;
    private readonly relationsById: ReadonlyMap<string, KnowledgeRelation>;
    private readonly outgoingByNodeId: ReadonlyMap<string, readonly KnowledgeRelation[]>;
    private readonly incomingByNodeId: ReadonlyMap<string, readonly KnowledgeRelation[]>;

    public constructor(
        nodes: readonly KnowledgeNode[] = [],
        relations: readonly KnowledgeRelation[] = []
    ) {
        this.nodes = Object.freeze([...nodes].sort(KnowledgeGraph.compareById));
        this.nodesById = this.indexNodes(this.nodes);
        this.relations = Object.freeze([...relations].sort(KnowledgeGraph.compareById));
        this.relationsById = this.indexRelations(this.relations);
        this.validateRelationEndpoints(this.relations);
        this.outgoingByNodeId = this.indexRelationsByNode(this.relations, "sourceId");
        this.incomingByNodeId = this.indexRelationsByNode(this.relations, "targetId");
        Object.freeze(this);
    }

    public getNode(id: string): KnowledgeNode | undefined {
        return this.nodesById.get(id);
    }

    public getRelation(id: string): KnowledgeRelation | undefined {
        return this.relationsById.get(id);
    }

    public hasNode(id: string): boolean {
        return this.nodesById.has(id);
    }

    public hasRelation(id: string): boolean {
        return this.relationsById.has(id);
    }

    public getNodes(): readonly KnowledgeNode[] {
        return this.nodes;
    }

    public getRelations(): readonly KnowledgeRelation[] {
        return this.relations;
    }

    public getOutgoingRelations(nodeId: string): readonly KnowledgeRelation[] {
        return this.outgoingByNodeId.get(nodeId) ?? KnowledgeGraph.emptyRelations;
    }

    public getIncomingRelations(nodeId: string): readonly KnowledgeRelation[] {
        return this.incomingByNodeId.get(nodeId) ?? KnowledgeGraph.emptyRelations;
    }

    private static readonly emptyRelations: readonly KnowledgeRelation[] = Object.freeze([]);

    private static compareById<T extends { readonly id: string }>(left: T, right: T): number {
        return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    }

    private indexNodes(nodes: readonly KnowledgeNode[]): ReadonlyMap<string, KnowledgeNode> {
        const index = new Map<string, KnowledgeNode>();
        for (const node of nodes) {
            if (index.has(node.id)) {
                throw new Error(`Duplicate node ID: ${node.id}`);
            }
            index.set(node.id, node);
        }
        return index;
    }

    private indexRelations(
        relations: readonly KnowledgeRelation[]
    ): ReadonlyMap<string, KnowledgeRelation> {
        const index = new Map<string, KnowledgeRelation>();
        for (const relation of relations) {
            if (index.has(relation.id)) {
                throw new Error(`Duplicate relation ID: ${relation.id}`);
            }
            index.set(relation.id, relation);
        }
        return index;
    }

    private validateRelationEndpoints(relations: readonly KnowledgeRelation[]): void {
        for (const relation of relations) {
            if (!this.nodesById.has(relation.sourceId)) {
                throw new Error(`Unknown relation source ID: ${relation.sourceId}`);
            }
            if (!this.nodesById.has(relation.targetId)) {
                throw new Error(`Unknown relation target ID: ${relation.targetId}`);
            }
        }
    }

    private indexRelationsByNode(
        relations: readonly KnowledgeRelation[],
        endpoint: "sourceId" | "targetId"
    ): ReadonlyMap<string, readonly KnowledgeRelation[]> {
        const mutableIndex = new Map<string, KnowledgeRelation[]>();
        for (const relation of relations) {
            const nodeId = relation[endpoint];
            const indexedRelations = mutableIndex.get(nodeId) ?? [];
            indexedRelations.push(relation);
            mutableIndex.set(nodeId, indexedRelations);
        }

        const index = new Map<string, readonly KnowledgeRelation[]>();
        for (const [nodeId, indexedRelations] of mutableIndex) {
            index.set(nodeId, Object.freeze(indexedRelations));
        }
        return index;
    }
}
