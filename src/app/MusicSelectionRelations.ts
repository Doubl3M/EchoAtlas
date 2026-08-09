import type { KnowledgeGraph, KnowledgeRelation } from "../knowledge";
import type { MusicCatalog, MusicEntity } from "../music";

export interface MusicSelectionRelation {
    readonly knowledgeNodeId: string;
    readonly relationId: string;
    readonly entity: MusicEntity;
}

export type MusicSelectionRelationProvider = (
    knowledgeNodeId: string
) => readonly MusicSelectionRelation[];

/** Resolves canonical graph adjacency to immutable Music entities for application presentation. */
export function createMusicSelectionRelationProvider(
    catalog: MusicCatalog,
    graph: KnowledgeGraph
): MusicSelectionRelationProvider {
    const entities = new Map<string, MusicEntity>(
        catalog
            .getEntities()
            .map((entity) => [`music:${entity.kind}:${entity.id}`, entity] as const)
    );

    return (knowledgeNodeId: string): readonly MusicSelectionRelation[] => {
        const relations = canonicalRelations(graph, knowledgeNodeId);
        const relatedNodeIds = new Set<string>();
        const resolved: MusicSelectionRelation[] = [];
        for (const relation of relations) {
            const relatedNodeId =
                relation.sourceId === knowledgeNodeId ? relation.targetId : relation.sourceId;
            const entity = entities.get(relatedNodeId);
            if (entity === undefined || relatedNodeIds.has(relatedNodeId)) {
                continue;
            }
            relatedNodeIds.add(relatedNodeId);
            resolved.push(
                Object.freeze({
                    knowledgeNodeId: relatedNodeId,
                    relationId: relation.id,
                    entity,
                })
            );
        }
        return Object.freeze(resolved);
    };
}

function canonicalRelations(
    graph: KnowledgeGraph,
    knowledgeNodeId: string
): readonly KnowledgeRelation[] {
    const byId = new Map<string, KnowledgeRelation>();
    for (const relation of graph.getOutgoingRelations(knowledgeNodeId)) {
        byId.set(relation.id, relation);
    }
    for (const relation of graph.getIncomingRelations(knowledgeNodeId)) {
        byId.set(relation.id, relation);
    }
    return Object.freeze([...byId.values()].sort(compareRelation));
}

function compareRelation(left: KnowledgeRelation, right: KnowledgeRelation): number {
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
