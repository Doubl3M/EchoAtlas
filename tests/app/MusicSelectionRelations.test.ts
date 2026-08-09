import { describe, expect, it } from "vitest";

import { createMusicSelectionRelationProvider } from "../../src/app/MusicSelectionRelations";
import { KnowledgeGraph, KnowledgeNode, KnowledgeRelation } from "../../src/knowledge";
import { MusicCatalog, MusicEntity, MusicInterpreter, MusicRelation } from "../../src/music";

const artist = new MusicEntity({ kind: "artist", id: "artist", name: "Artist" });
const alpha = new MusicEntity({ kind: "album", id: "alpha", title: "Alpha" });
const omega = new MusicEntity({ kind: "album", id: "omega", title: "Omega" });
const disconnected = new MusicEntity({ kind: "playlist", id: "quiet", name: "Quiet" });

function relation(id: string, targetId: string): MusicRelation {
    return new MusicRelation({
        id,
        kind: "created",
        sourceKind: "artist",
        sourceId: artist.id,
        targetKind: "album",
        targetId,
    });
}

function fixture(): { readonly catalog: MusicCatalog; readonly graph: KnowledgeGraph } {
    const catalog = new MusicCatalog(
        [omega, disconnected, artist, alpha],
        [
            relation("z-omega", omega.id),
            relation("b-alpha-again", alpha.id),
            relation("a-alpha", alpha.id),
        ]
    );
    return { catalog, graph: new MusicInterpreter().interpret(catalog) };
}

describe("Music selection relations", () => {
    it("resolves only real incoming and outgoing graph neighbours", () => {
        const { catalog, graph } = fixture();
        const connections = createMusicSelectionRelationProvider(
            catalog,
            graph
        )("music:artist:artist");

        expect(
            connections.map(({ knowledgeNodeId, relationId, entity }) => ({
                knowledgeNodeId,
                relationId,
                title: entity.title,
            }))
        ).toEqual([
            {
                knowledgeNodeId: "music:album:alpha",
                relationId: "music:relation:a-alpha",
                title: "Alpha",
            },
            {
                knowledgeNodeId: "music:album:omega",
                relationId: "music:relation:z-omega",
                title: "Omega",
            },
        ]);
        expect(connections.some(({ entity }) => entity === disconnected)).toBe(false);
    });

    it("keeps canonical ordering independent from catalog insertion order", () => {
        const first = fixture();
        const secondCatalog = new MusicCatalog(
            [alpha, artist, disconnected, omega],
            [
                relation("a-alpha", alpha.id),
                relation("b-alpha-again", alpha.id),
                relation("z-omega", omega.id),
            ]
        );
        const firstIds = createMusicSelectionRelationProvider(
            first.catalog,
            first.graph
        )("music:artist:artist").map(({ knowledgeNodeId }) => knowledgeNodeId);
        const secondIds = createMusicSelectionRelationProvider(
            secondCatalog,
            new MusicInterpreter().interpret(secondCatalog)
        )("music:artist:artist").map(({ knowledgeNodeId }) => knowledgeNodeId);

        expect(secondIds).toEqual(firstIds);
    });

    it("keeps graph neighbours accessible regardless of Canvas visibility", () => {
        const { catalog, graph } = fixture();
        const provider = createMusicSelectionRelationProvider(catalog, graph);

        expect(provider("music:album:alpha")[0]?.knowledgeNodeId).toBe("music:artist:artist");
    });

    it("does not invent Music entities for generic graph neighbours", () => {
        const catalog = new MusicCatalog([artist]);
        const graph = new KnowledgeGraph(
            [
                new KnowledgeNode({ id: "music:artist:artist", kind: "artist", weight: 1 }),
                new KnowledgeNode({ id: "generic:ghost", kind: "concept", weight: 1 }),
            ],
            [
                new KnowledgeRelation({
                    id: "ghost-link",
                    sourceId: "music:artist:artist",
                    targetId: "generic:ghost",
                    kind: "related",
                    weight: 1,
                }),
            ]
        );

        expect(createMusicSelectionRelationProvider(catalog, graph)("music:artist:artist")).toEqual(
            []
        );
    });

    it("returns an immutable empty result for an entity without relations", () => {
        const catalog = new MusicCatalog([disconnected]);
        const result = createMusicSelectionRelationProvider(
            catalog,
            new MusicInterpreter().interpret(catalog)
        )("music:playlist:quiet");

        expect(result).toEqual([]);
        expect(Object.isFrozen(result)).toBe(true);
    });
});
