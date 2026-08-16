import { describe, expect, it } from "vitest";

import {
    ListeningEvent,
    ListeningHistory,
    MusicCatalog,
    MusicEntity,
    MusicInterpreter,
    MusicRelation,
    TemporalMusicProjector,
    musicKnowledgeNodeId,
    type MusicEntityKind,
    type TemporalMusicRulesVersion,
} from "../../../src/music";

const projector = new TemporalMusicProjector({
    rulesVersion: "temporal-music-presence-v1",
});

describe("TemporalMusicProjector", () => {
    it("projects an empty history to an empty catalog", () => {
        expect(project(chainCatalog(), []).getCatalog().getEntities()).toEqual([]);
    });

    it("propagates a Track to its Album, Artist and Genre ancestors", () => {
        expect(
            entityIdentities(project(chainCatalog(), [listen("track", "overcome", 10)]))
        ).toEqual(["album:maxinquaye", "artist:tricky", "genre:trip-hop", "track:overcome"]);
    });

    it("propagates an Album only to its Artist and Genre ancestors", () => {
        expect(
            entityIdentities(project(chainCatalog(), [listen("album", "maxinquaye", 10)]))
        ).toEqual(["album:maxinquaye", "artist:tricky", "genre:trip-hop"]);
    });

    it("propagates an Artist only to its Genre ancestor", () => {
        expect(entityIdentities(project(chainCatalog(), [listen("artist", "tricky", 10)]))).toEqual(
            ["artist:tricky", "genre:trip-hop"]
        );
    });

    it("keeps a directly listened Genre without descendants", () => {
        expect(
            entityIdentities(project(chainCatalog(), [listen("genre", "trip-hop", 10)]))
        ).toEqual(["genre:trip-hop"]);
    });

    it.each([
        ["label", "island"],
        ["playlist", "mix"],
        ["compilation", "collection"],
    ] as const)("keeps a directly listened %s without propagation", (kind, id) => {
        expect(entityIdentities(project(chainCatalog(), [listen(kind, id, 10)]))).toEqual([
            `${kind}:${id}`,
        ]);
    });

    it("does not propagate Playlist, Label or Compilation through non-structural relations", () => {
        const snapshot = project(chainCatalog(), [listen("track", "overcome", 10)]);
        const identities = entityIdentities(snapshot);

        expect(identities).not.toContain("playlist:mix");
        expect(identities).not.toContain("label:island");
        expect(identities).not.toContain("compilation:collection");
    });

    it("keeps every original relation whose endpoints are present", () => {
        const snapshot = project(chainCatalog(), [
            listen("track", "overcome", 10),
            listen("artist", "massive-attack", 10, "listen-collaborator"),
        ]);

        expect(
            snapshot
                .getCatalog()
                .getRelations()
                .map(({ id }) => id)
        ).toEqual(["album-track", "artist-album", "artist-collaboration", "genre-artist"]);
    });

    it("filters every relation with an absent endpoint", () => {
        const snapshot = project(chainCatalog(), [listen("genre", "trip-hop", 10)]);
        expect(snapshot.getCatalog().getRelations()).toEqual([]);
    });

    it("ignores an unresolved listening identity without error or invention", () => {
        const history = new ListeningHistory([listen("track", "unknown", 10)]);

        expect(
            projector
                .project({ catalog: chainCatalog(), listeningHistory: history, at: 10 })
                .getCatalog()
                .getEntities()
        ).toEqual([]);

        const enriched = new MusicCatalog([entity("track", "unknown")]);
        expect(
            entityIdentities(
                projector.project({ catalog: enriched, listeningHistory: history, at: 10 })
            )
        ).toEqual(["track:unknown"]);
    });

    it("stops propagation when a structural parent is absent from the catalog", () => {
        const catalog = new MusicCatalog(
            [entity("track", "orphan")],
            [relation("missing-parent", "album", "missing", "contains", "track", "orphan")]
        );

        expect(entityIdentities(project(catalog, [listen("track", "orphan", 10)]))).toEqual([
            "track:orphan",
        ]);
    });

    it("includes every valid Album, Artist and Genre parent", () => {
        const catalog = multiParentCatalog();

        expect(entityIdentities(project(catalog, [listen("track", "shared-track", 10)]))).toEqual([
            "album:album-a",
            "album:album-b",
            "artist:artist-a",
            "artist:artist-b",
            "genre:genre-a",
            "genre:genre-b",
            "track:shared-track",
        ]);
    });

    it("ignores inverse and wrong-kind structural-looking relations", () => {
        const catalog = new MusicCatalog(
            [entity("artist", "artist"), entity("album", "album"), entity("track", "track")],
            [
                relation("inverse", "track", "track", "contains", "album", "album"),
                relation("alias", "artist", "artist", "created", "album", "album"),
            ]
        );

        expect(entityIdentities(project(catalog, [listen("track", "track", 10)]))).toEqual([
            "track:track",
        ]);
    });

    it("uses an inclusive explicit T and excludes future entities", () => {
        const history = [
            listen("track", "overcome", 10),
            listen("track", "future-track", 11, "future-listen"),
        ];
        const atT = project(chainCatalog(), history, 10);

        expect(entityIdentities(atT)).toContain("track:overcome");
        expect(entityIdentities(atT)).not.toContain("track:future-track");
        expect(entityIdentities(project(chainCatalog(), history, 9))).toEqual([]);
    });

    it("reconstructs T3 independently from earlier projections", () => {
        const history = new ListeningHistory([
            listen("genre", "trip-hop", 10),
            listen("album", "maxinquaye", 20, "album-listen"),
            listen("track", "overcome", 30, "track-listen"),
        ]);
        const direct = projector.project({
            catalog: chainCatalog(),
            listeningHistory: history,
            at: 30,
        });

        projector.project({ catalog: chainCatalog(), listeningHistory: history, at: 10 });
        projector.project({ catalog: chainCatalog(), listeningHistory: history, at: 20 });
        const navigated = projector.project({
            catalog: chainCatalog(),
            listeningHistory: history,
            at: 30,
        });

        expect(snapshotSignature(navigated)).toEqual(snapshotSignature(direct));
    });

    it("is canonical across catalog, relation and event permutations", () => {
        const catalog = chainCatalog();
        const events = [
            listen("track", "overcome", 20),
            listen("artist", "tricky", 10, "artist-listen"),
        ];
        const permutedCatalog = new MusicCatalog(
            [...catalog.getEntities()].reverse(),
            [...catalog.getRelations()].reverse()
        );

        expect(snapshotSignature(project(permutedCatalog, [...events].reverse(), 20))).toEqual(
            snapshotSignature(project(catalog, events, 20))
        );
    });

    it("integrates through MusicInterpreter without leaking a future entity", () => {
        const snapshot = project(chainCatalog(), [listen("track", "overcome", 10)]);
        const graph = new MusicInterpreter().interpret(snapshot.getCatalog());

        expect(graph.hasNode(musicKnowledgeNodeId("track", "overcome"))).toBe(true);
        expect(graph.hasNode(musicKnowledgeNodeId("album", "maxinquaye"))).toBe(true);
        expect(graph.hasNode(musicKnowledgeNodeId("artist", "tricky"))).toBe(true);
        expect(graph.hasNode(musicKnowledgeNodeId("genre", "trip-hop"))).toBe(true);
        expect(graph.hasNode(musicKnowledgeNodeId("track", "future-track"))).toBe(false);
    });

    it("rejects an unknown rules version and invalid T without fallback", () => {
        expect(
            () =>
                new TemporalMusicProjector({
                    rulesVersion: "temporal-music-presence-v2" as TemporalMusicRulesVersion,
                })
        ).toThrow("Unsupported temporal Music rules version");
        expect(() =>
            projector.project({
                catalog: chainCatalog(),
                listeningHistory: new ListeningHistory(),
                at: 1.5,
            })
        ).toThrow(RangeError);
    });
});

function project(catalog: MusicCatalog, events: readonly ListeningEvent[], at = 10) {
    return projector.project({ catalog, listeningHistory: new ListeningHistory(events), at });
}

function listen(
    musicEntityKind: MusicEntityKind,
    musicEntityId: string,
    occurredAt: number,
    id = "listen"
): ListeningEvent {
    return new ListeningEvent({ id, occurredAt, musicEntityKind, musicEntityId });
}

function entity(kind: MusicEntityKind, id: string): MusicEntity {
    if (kind === "album") return new MusicEntity({ kind, id, title: id });
    if (kind === "track") return new MusicEntity({ kind, id, title: id });
    return new MusicEntity({ kind, id, name: id });
}

function relation(
    id: string,
    sourceKind: MusicEntityKind,
    sourceId: string,
    kind: string,
    targetKind: MusicEntityKind,
    targetId: string
): MusicRelation {
    return new MusicRelation({ id, sourceKind, sourceId, kind, targetKind, targetId });
}

function chainCatalog(): MusicCatalog {
    return new MusicCatalog(
        [
            entity("genre", "trip-hop"),
            entity("artist", "tricky"),
            entity("artist", "massive-attack"),
            entity("album", "maxinquaye"),
            entity("track", "overcome"),
            entity("track", "future-track"),
            entity("label", "island"),
            entity("playlist", "mix"),
            entity("compilation", "collection"),
        ],
        [
            relation("genre-artist", "genre", "trip-hop", "includes", "artist", "tricky"),
            relation("artist-album", "artist", "tricky", "performed", "album", "maxinquaye"),
            relation("album-track", "album", "maxinquaye", "contains", "track", "overcome"),
            relation("playlist-track", "playlist", "mix", "contains", "track", "overcome"),
            relation("album-label", "album", "maxinquaye", "released-by", "label", "island"),
            relation(
                "compilation-track",
                "compilation",
                "collection",
                "contains",
                "track",
                "overcome"
            ),
            relation(
                "artist-collaboration",
                "artist",
                "tricky",
                "collaborated-with",
                "artist",
                "massive-attack"
            ),
        ]
    );
}

function multiParentCatalog(): MusicCatalog {
    return new MusicCatalog(
        [
            entity("genre", "genre-a"),
            entity("genre", "genre-b"),
            entity("artist", "artist-a"),
            entity("artist", "artist-b"),
            entity("album", "album-a"),
            entity("album", "album-b"),
            entity("track", "shared-track"),
        ],
        [
            relation("g-a", "genre", "genre-a", "includes", "artist", "artist-a"),
            relation("g-b", "genre", "genre-b", "includes", "artist", "artist-b"),
            relation("a-a", "artist", "artist-a", "performed", "album", "album-a"),
            relation("a-b", "artist", "artist-b", "performed", "album", "album-b"),
            relation("t-a", "album", "album-a", "contains", "track", "shared-track"),
            relation("t-b", "album", "album-b", "contains", "track", "shared-track"),
        ]
    );
}

function entityIdentities(snapshot: ReturnType<typeof project>): readonly string[] {
    return snapshot
        .getCatalog()
        .getEntities()
        .map(({ kind, id }) => `${kind}:${id}`);
}

function snapshotSignature(snapshot: ReturnType<typeof project>): object {
    return {
        at: snapshot.at,
        version: snapshot.rulesVersion,
        entities: entityIdentities(snapshot),
        relations: snapshot
            .getCatalog()
            .getRelations()
            .map(({ id }) => id),
    };
}
