import { describe, expect, it } from "vitest";

import type { MusicEntityKind } from "../../src/music";
import { getStructuralMusicRelationKindV1, isStructuralMusicRelationV1 } from "../../src/music";

describe("V1 structural Music relations", () => {
    it.each([
        ["genre", "includes", "artist"],
        ["artist", "performed", "album"],
        ["album", "contains", "track"],
    ] as const)("recognizes %s --%s--> %s", (sourceKind, relationKind, targetKind) => {
        expect(isStructuralMusicRelationV1({ sourceKind, relationKind, targetKind })).toBe(true);
        expect(getStructuralMusicRelationKindV1(sourceKind, targetKind)).toBe(relationKind);
    });

    it.each([
        ["playlist", "contains", "track"],
        ["album", "performed", "track"],
        ["album", "performed", "artist"],
        ["artist", "includes", "genre"],
        ["artist", "created", "album"],
        ["genre", "Includes", "artist"],
        ["artist", "PERFORMED", "album"],
        ["album", "contains ", "track"],
    ] as const)("rejects %s --%s--> %s", (sourceKind, relationKind, targetKind) => {
        expect(
            isStructuralMusicRelationV1({
                sourceKind: sourceKind as MusicEntityKind,
                relationKind,
                targetKind: targetKind as MusicEntityKind,
            })
        ).toBe(false);
    });

    it("does not infer a kind for non-structural endpoint pairs", () => {
        expect(getStructuralMusicRelationKindV1("playlist", "track")).toBeUndefined();
        expect(getStructuralMusicRelationKindV1("album", "artist")).toBeUndefined();
    });
});
