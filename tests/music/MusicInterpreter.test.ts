import { describe, expect, it } from "vitest";

import { MusicCatalog, MusicEntity, MusicInterpreter, MusicRelation } from "../../src/music";

function entity(id: string, kind: "artist" | "album" | "label" = "artist"): MusicEntity {
    return new MusicEntity({ id, kind });
}

function relation(id: string, sourceId: string, targetId: string, kind = "related"): MusicRelation {
    return new MusicRelation({
        id,
        sourceKind: "artist",
        sourceId,
        targetKind: "artist",
        targetId,
        kind,
    });
}

function referenceCatalog(): MusicCatalog {
    return new MusicCatalog(
        [
            new MusicEntity({ id: "artist-a", kind: "artist", weight: 3 }),
            new MusicEntity({ id: "album-a", kind: "album", weight: 2 }),
            new MusicEntity({ id: "label-a", kind: "label" }),
            new MusicEntity({ id: "genre-a", kind: "genre" }),
            new MusicEntity({ id: "playlist-a", kind: "playlist" }),
            new MusicEntity({ id: "compilation-a", kind: "compilation" }),
        ],
        [
            new MusicRelation({
                id: "artist-album",
                sourceKind: "artist",
                sourceId: "artist-a",
                targetKind: "album",
                targetId: "album-a",
                kind: "performed",
                weight: 4,
            }),
            new MusicRelation({
                id: "album-label",
                sourceKind: "album",
                sourceId: "album-a",
                targetKind: "label",
                targetId: "label-a",
                kind: "released-by",
            }),
        ]
    );
}

describe("MusicCatalog", () => {
    it("copies and protects its input collections", () => {
        const entities = [entity("a")];
        const relations = [relation("r", "a", "a")];
        const catalog = new MusicCatalog(entities, relations);
        entities.length = 0;
        relations.length = 0;

        expect(Object.isFrozen(catalog)).toBe(true);
        expect(Object.isFrozen(catalog.getEntities())).toBe(true);
        expect(Object.isFrozen(catalog.getRelations())).toBe(true);
        expect(() => (catalog.getEntities() as MusicEntity[]).pop()).toThrow(TypeError);
        expect(() => (catalog.getRelations() as MusicRelation[]).pop()).toThrow(TypeError);
        expect(catalog.getEntities()).toHaveLength(1);
        expect(catalog.getRelations()).toHaveLength(1);
    });
});

describe("MusicInterpreter", () => {
    it("interprets an empty catalog", () => {
        const graph = new MusicInterpreter().interpret(new MusicCatalog());

        expect(graph.getNodes()).toEqual([]);
        expect(graph.getRelations()).toEqual([]);
    });

    it("maps one entity to a namespaced semantic node", () => {
        const graph = new MusicInterpreter().interpret(
            new MusicCatalog([new MusicEntity({ id: "prince", kind: "artist", weight: 7 })])
        );

        expect(graph.getNodes()).toEqual([
            { id: "music:artist:prince", kind: "music:artist", weight: 7 },
        ]);
    });

    it("freezes the complete reference mapping and canonical order", () => {
        const graph = new MusicInterpreter().interpret(referenceCatalog());

        expect(graph.getNodes()).toEqual([
            { id: "music:album:album-a", kind: "music:album", weight: 2 },
            { id: "music:artist:artist-a", kind: "music:artist", weight: 3 },
            { id: "music:compilation:compilation-a", kind: "music:compilation", weight: 1 },
            { id: "music:genre:genre-a", kind: "music:genre", weight: 1 },
            { id: "music:label:label-a", kind: "music:label", weight: 1 },
            { id: "music:playlist:playlist-a", kind: "music:playlist", weight: 1 },
        ]);
        expect(graph.getRelations()).toEqual([
            {
                id: "music:relation:album-label",
                sourceId: "music:album:album-a",
                targetId: "music:label:label-a",
                kind: "music:released-by",
                weight: 1,
            },
            {
                id: "music:relation:artist-album",
                sourceId: "music:artist:artist-a",
                targetId: "music:album:album-a",
                kind: "music:performed",
                weight: 4,
            },
        ]);
    });

    it("avoids collisions between equal IDs in different categories", () => {
        const graph = new MusicInterpreter().interpret(
            new MusicCatalog([entity("shared", "artist"), entity("shared", "album")])
        );

        expect(graph.getNodes().map(({ id }) => id)).toEqual([
            "music:album:shared",
            "music:artist:shared",
        ]);
    });

    it("keeps namespaced identities injective without parsing canonical IDs", () => {
        const graph = new MusicInterpreter().interpret(
            new MusicCatalog([entity("album:42", "artist"), entity("42", "album")])
        );

        expect(graph.getNodes().map(({ id }) => id)).toEqual([
            "music:album:42",
            "music:artist:album:42",
        ]);
    });

    it("resolves equal canonical IDs through their entity categories", () => {
        const graph = new MusicInterpreter().interpret(
            new MusicCatalog(
                [entity("42", "artist"), entity("42", "album"), entity("target")],
                [
                    new MusicRelation({
                        id: "from-artist",
                        sourceKind: "artist",
                        sourceId: "42",
                        targetKind: "artist",
                        targetId: "target",
                        kind: "related",
                    }),
                    new MusicRelation({
                        id: "from-album",
                        sourceKind: "album",
                        sourceId: "42",
                        targetKind: "artist",
                        targetId: "target",
                        kind: "related",
                    }),
                ]
            )
        );

        expect(graph.getRelation("music:relation:from-artist")?.sourceId).toBe("music:artist:42");
        expect(graph.getRelation("music:relation:from-album")?.sourceId).toBe("music:album:42");
    });

    it("preserves direction and distinct parallel relations", () => {
        const graph = new MusicInterpreter().interpret(
            new MusicCatalog(
                [entity("a"), entity("b")],
                [relation("r2", "a", "b"), relation("r1", "a", "b", "collaborated-with")]
            )
        );

        expect(graph.getOutgoingRelations("music:artist:a").map(({ id }) => id)).toEqual([
            "music:relation:r1",
            "music:relation:r2",
        ]);
        expect(graph.getOutgoingRelations("music:artist:b")).toEqual([]);
    });

    it("supports an explicitly supplied self-relation", () => {
        const graph = new MusicInterpreter().interpret(
            new MusicCatalog([entity("a")], [relation("self", "a", "a", "influences")])
        );

        expect(graph.getRelation("music:relation:self")).toMatchObject({
            sourceId: "music:artist:a",
            targetId: "music:artist:a",
        });
    });

    it("rejects duplicate entity identities", () => {
        expect(() => new MusicCatalog([entity("a"), entity("a")])).toThrow(
            "Duplicate music entity identity: artist:a"
        );
    });

    it("requires relation IDs to be globally unique across relation kinds", () => {
        expect(
            () =>
                new MusicCatalog(
                    [entity("a"), entity("b")],
                    [relation("same", "a", "b"), relation("same", "b", "a", "different")]
                )
        ).toThrow("Duplicate music relation ID: same");
    });

    it("preserves exact relation kinds and finite weights without normalization", () => {
        const musicRelation = new MusicRelation({
            id: "weighted",
            sourceKind: "artist",
            sourceId: "a",
            targetKind: "artist",
            targetId: "b",
            kind: "Collaboré-avec",
            weight: -2,
        });
        const graph = new MusicInterpreter().interpret(
            new MusicCatalog([entity("a"), entity("b")], [musicRelation])
        );

        expect(graph.getRelation("music:relation:weighted")).toMatchObject({
            kind: "music:Collaboré-avec",
            weight: -2,
        });
        expect(musicRelation.kind).toBe("Collaboré-avec");
    });

    it("reconstructs a future navigation path using stable identities only", () => {
        const catalog = new MusicCatalog(
            [entity("album-a", "album"), entity("x"), entity("y"), entity("album-b", "album")],
            [
                new MusicRelation({
                    id: "R1",
                    sourceKind: "album",
                    sourceId: "album-a",
                    targetKind: "artist",
                    targetId: "x",
                    kind: "performed-by",
                }),
                relation("R2", "x", "y", "collaborated-with"),
                new MusicRelation({
                    id: "R3",
                    sourceKind: "artist",
                    sourceId: "y",
                    targetKind: "album",
                    targetId: "album-b",
                    kind: "performed",
                }),
            ]
        );
        const graph = new MusicInterpreter().interpret(catalog);

        expect([
            graph.getNode("music:album:album-a")?.id,
            graph.getRelation("music:relation:R1")?.id,
            graph.getNode("music:artist:x")?.id,
            graph.getRelation("music:relation:R2")?.id,
            graph.getNode("music:artist:y")?.id,
            graph.getRelation("music:relation:R3")?.id,
            graph.getNode("music:album:album-b")?.id,
        ]).toEqual([
            "music:album:album-a",
            "music:relation:R1",
            "music:artist:x",
            "music:relation:R2",
            "music:artist:y",
            "music:relation:R3",
            "music:album:album-b",
        ]);
    });
    it.each([
        ["source", relation("r", "missing", "b")],
        ["target", relation("r", "a", "missing")],
    ] as const)("rejects an unknown relation %s", (_endpoint, musicRelation) => {
        const catalog = new MusicCatalog([entity("a"), entity("b")], [musicRelation]);

        expect(() => new MusicInterpreter().interpret(catalog)).toThrow(/Unknown music relation/);
    });

    it("is reproducible and independent of input order", () => {
        const catalog = referenceCatalog();
        const independentlyConstructedCatalog = referenceCatalog();
        const reversed = new MusicCatalog(
            [...independentlyConstructedCatalog.getEntities()].reverse(),
            [...independentlyConstructedCatalog.getRelations()].reverse()
        );
        const interpreter = new MusicInterpreter();
        const first = interpreter.interpret(catalog);
        const second = interpreter.interpret(reversed);

        expect(second.getNodes()).toEqual(first.getNodes());
        expect(second.getRelations()).toEqual(first.getRelations());
        expect(second.getNode("music:artist:artist-a")?.id).toBe(
            first.getNode("music:artist:artist-a")?.id
        );
        expect(second).not.toBe(first);
        expect(second.getNodes()).not.toBe(first.getNodes());
    });

    it("does not mutate the source catalog during interpretation", () => {
        const catalog = referenceCatalog();
        const entities = [...catalog.getEntities()];
        const relations = [...catalog.getRelations()];

        new MusicInterpreter().interpret(catalog);

        expect(catalog.getEntities()).toEqual(entities);
        expect(catalog.getRelations()).toEqual(relations);
    });
});
