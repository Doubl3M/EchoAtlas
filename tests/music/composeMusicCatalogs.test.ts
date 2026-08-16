import { describe, expect, it } from "vitest";

import { composeMusicCatalogs, MusicCatalog, MusicEntity, MusicRelation } from "../../src/music";

describe("composeMusicCatalogs", () => {
    it("canonically composes independent immutable sources", () => {
        const base = new MusicCatalog([
            new MusicEntity({ kind: "artist", id: "artist", name: "Artist" }),
        ]);
        const extension = new MusicCatalog(
            [new MusicEntity({ kind: "genre", id: "genre", name: "Genre" })],
            [
                new MusicRelation({
                    id: "genre-artist",
                    kind: "includes",
                    sourceKind: "genre",
                    sourceId: "genre",
                    targetKind: "artist",
                    targetId: "artist",
                }),
            ]
        );

        const composed = composeMusicCatalogs([extension, base]);

        expect(composed.getEntities().map(({ kind, id }) => `${kind}:${id}`)).toEqual([
            "artist:artist",
            "genre:genre",
        ]);
        expect(composed.getRelations().map(({ id }) => id)).toEqual(["genre-artist"]);
        expect(base.getRelations()).toEqual([]);
    });

    it("rejects entity and relation identity collisions", () => {
        const duplicateEntity = () =>
            composeMusicCatalogs([
                new MusicCatalog([new MusicEntity({ kind: "genre", id: "g", name: "First" })]),
                new MusicCatalog([new MusicEntity({ kind: "genre", id: "g", name: "Second" })]),
            ]);
        const relation = (targetId: string) =>
            new MusicRelation({
                id: "same-relation",
                kind: "includes",
                sourceKind: "genre",
                sourceId: "g",
                targetKind: "artist",
                targetId,
            });

        expect(duplicateEntity).toThrow("Duplicate music entity identity");
        expect(() =>
            composeMusicCatalogs([
                new MusicCatalog([], [relation("a")]),
                new MusicCatalog([], [relation("b")]),
            ])
        ).toThrow("Duplicate music relation ID");
    });

    it("rejects non-catalog runtime inputs", () => {
        expect(() => composeMusicCatalogs([{} as MusicCatalog])).toThrow(TypeError);
    });
});
