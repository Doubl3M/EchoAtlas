import { KnowledgeGraph, KnowledgeNode, KnowledgeRelation } from "../knowledge";
import type { MusicEntity } from "./MusicEntity";
import type { MusicCatalog } from "./MusicCatalog";
import type { MusicRelation } from "./MusicRelation";
import { musicKnowledgeNodeId, musicKnowledgeNodeKind } from "./MusicKnowledgeIdentity";

/** Deterministically translates musical semantics into the generic Knowledge Graph. */
export class MusicInterpreter {
    public interpret(catalog: MusicCatalog): KnowledgeGraph {
        const entitiesByKnowledgeId = this.indexEntities(catalog.getEntities());
        const nodes = [...entitiesByKnowledgeId.entries()].map(
            ([id, entity]) =>
                new KnowledgeNode({
                    id,
                    kind: musicKnowledgeNodeKind(entity.kind),
                    weight: entity.weight,
                })
        );
        const relations = catalog
            .getRelations()
            .map((relation) => this.interpretRelation(relation, entitiesByKnowledgeId));

        return new KnowledgeGraph(nodes, relations);
    }

    private indexEntities(entities: readonly MusicEntity[]): ReadonlyMap<string, MusicEntity> {
        const index = new Map<string, MusicEntity>();
        for (const entity of entities) {
            const knowledgeId = musicKnowledgeNodeId(entity.kind, entity.id);
            index.set(knowledgeId, entity);
        }
        return index;
    }

    private interpretRelation(
        relation: MusicRelation,
        entities: ReadonlyMap<string, MusicEntity>
    ): KnowledgeRelation {
        const sourceId = musicKnowledgeNodeId(relation.sourceKind, relation.sourceId);
        const targetId = musicKnowledgeNodeId(relation.targetKind, relation.targetId);
        if (!entities.has(sourceId)) {
            throw new Error(
                `Unknown music relation source: ${relation.sourceKind}:${relation.sourceId}`
            );
        }
        if (!entities.has(targetId)) {
            throw new Error(
                `Unknown music relation target: ${relation.targetKind}:${relation.targetId}`
            );
        }

        return new KnowledgeRelation({
            id: `music:relation:${relation.id}`,
            sourceId,
            targetId,
            kind: `music:${relation.kind}`,
            weight: relation.weight,
        });
    }
}
