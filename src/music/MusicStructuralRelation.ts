import type { MusicEntityKind } from "./MusicEntity";

export interface MusicStructuralRelationDescriptor {
    readonly sourceKind: MusicEntityKind;
    readonly relationKind: string;
    readonly targetKind: MusicEntityKind;
}

const structuralMusicRelationsV1 = Object.freeze([
    Object.freeze({ sourceKind: "genre", relationKind: "includes", targetKind: "artist" }),
    Object.freeze({ sourceKind: "artist", relationKind: "performed", targetKind: "album" }),
    Object.freeze({ sourceKind: "album", relationKind: "contains", targetKind: "track" }),
] as const satisfies readonly MusicStructuralRelationDescriptor[]);

/** Returns whether the exact directed Music relation is structural under the V1 semantics. */
export function isStructuralMusicRelationV1(relation: MusicStructuralRelationDescriptor): boolean {
    return structuralMusicRelationsV1.some(
        (rule) =>
            rule.sourceKind === relation.sourceKind &&
            rule.relationKind === relation.relationKind &&
            rule.targetKind === relation.targetKind
    );
}

/** Returns the exact V1 structural kind for directed endpoint kinds, when one exists. */
export function getStructuralMusicRelationKindV1(
    sourceKind: MusicEntityKind,
    targetKind: MusicEntityKind
): string | undefined {
    return structuralMusicRelationsV1.find(
        (rule) => rule.sourceKind === sourceKind && rule.targetKind === targetKind
    )?.relationKind;
}
