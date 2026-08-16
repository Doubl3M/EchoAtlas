import type { MusicEntityKind } from "./MusicEntity";

/** Returns the canonical Knowledge Node identity for a Music entity. */
export function musicKnowledgeNodeId(kind: MusicEntityKind, id: string): string {
    return `music:${kind}:${id}`;
}

/** Returns the canonical Knowledge Node kind for a Music entity kind. */
export function musicKnowledgeNodeKind(kind: MusicEntityKind): string {
    return `music:${kind}`;
}

/** Returns the canonical Knowledge Relation kind for an exact Music relation kind. */
export function musicKnowledgeRelationKind(kind: string): string {
    return `music:${kind}`;
}
