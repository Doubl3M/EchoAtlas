import { describe, expect, it } from "vitest";

import {
    ListeningEvent,
    ListeningHistory,
    MusicActivityProjector,
    MusicCatalog,
    MusicEntity,
    MusicRelation,
    TemporalMusicProjector,
    type MusicActivityRulesVersion,
    type MusicEntityKind,
} from "../../../src/music";

const ARTIST_INACTIVITY_THRESHOLD_MS = 15_552_000_000;

const activityProjector = new MusicActivityProjector({ rulesVersion: "music-activity-v1" });
const presenceProjector = new TemporalMusicProjector({
    rulesVersion: "temporal-music-presence-v1",
});

describe("MusicActivityProjector", () => {
    it("projects an empty history and a T before all events to no activity", () => {
        expect(project(chainCatalog(), [], 10).getActivities()).toEqual([]);
        expect(project(chainCatalog(), [listen("track", "track", 10)], 9).getActivities()).toEqual(
            []
        );
    });

    it.each([
        ["track", "track", ["album:album", "artist:artist", "genre:genre", "track:track"]],
        ["album", "album", ["album:album", "artist:artist", "genre:genre"]],
        ["artist", "artist", ["artist:artist", "genre:genre"]],
    ] as const)(
        "measures direct %s activity and its structural ancestors",
        (kind, id, expected) => {
            expect(activityIdentities(project(chainCatalog(), [listen(kind, id, 10)], 10))).toEqual(
                expected
            );
        }
    );

    it("propagates the latest descendant activity through Track, Album, Artist and Genre", () => {
        const snapshot = project(
            chainCatalog(),
            [listen("track", "track", 10), listen("track", "track", 30, "later")],
            30
        );

        for (const [kind, id] of [
            ["track", "track"],
            ["album", "album"],
            ["artist", "artist"],
            ["genre", "genre"],
        ] as const) {
            expect(snapshot.getActivity(kind, id)?.lastActivityAt).toBe(30);
        }
    });

    it("takes the maximum across distinct descendants", () => {
        const catalog = new MusicCatalog(
            [
                entity("genre", "genre"),
                entity("artist", "artist"),
                entity("album", "album-a"),
                entity("album", "album-b"),
                entity("track", "track-a"),
                entity("track", "track-b"),
            ],
            [
                relation("g-a", "genre", "genre", "includes", "artist", "artist"),
                relation("a-aa", "artist", "artist", "performed", "album", "album-a"),
                relation("a-ab", "artist", "artist", "performed", "album", "album-b"),
                relation("aa-ta", "album", "album-a", "contains", "track", "track-a"),
                relation("ab-tb", "album", "album-b", "contains", "track", "track-b"),
            ]
        );
        const snapshot = project(
            catalog,
            [listen("track", "track-a", 10), listen("track", "track-b", 30, "later")],
            30
        );

        expect(snapshot.getActivity("artist", "artist")?.lastActivityAt).toBe(30);
        expect(snapshot.getActivity("genre", "genre")?.lastActivityAt).toBe(30);
    });

    it("propagates to every valid structural parent", () => {
        const snapshot = project(multiParentCatalog(), [listen("track", "track", 20)], 20);

        expect(activityIdentities(snapshot)).toEqual([
            "album:album-a",
            "album:album-b",
            "artist:artist-a",
            "artist:artist-b",
            "genre:genre-a",
            "genre:genre-b",
            "track:track",
        ]);
    });

    it.each([
        ["label", "label"],
        ["playlist", "playlist"],
        ["compilation", "compilation"],
    ] as const)("measures direct %s activity without propagation or classification", (kind, id) => {
        const snapshot = project(chainCatalog(), [listen(kind, id, 10)], 10);
        const activity = snapshot.getActivity(kind, id);

        expect(activityIdentities(snapshot)).toEqual([`${kind}:${id}`]);
        expect(activity?.lastActivityAt).toBe(10);
        expect(activity?.state).toBeUndefined();
    });

    it("leaves every non-Artist activity unclassified", () => {
        const snapshot = project(chainCatalog(), [listen("track", "track", 10)], 20);

        for (const activity of snapshot.getActivities()) {
            if (activity.musicEntityKind !== "artist") expect(activity.state).toBeUndefined();
        }
    });

    it("ignores listening identities absent from the catalog", () => {
        expect(
            project(chainCatalog(), [listen("track", "missing", 10)], 10).getActivities()
        ).toEqual([]);
    });

    it("uses the latest event at or before inclusive T", () => {
        const events = [
            listen("artist", "artist", 10),
            listen("artist", "artist", 20, "at-t"),
            listen("artist", "artist", 21, "future"),
        ];

        expect(
            project(chainCatalog(), events, 20).getActivity("artist", "artist")?.lastActivityAt
        ).toBe(20);
    });

    it("classifies Artist immediately before, exactly at and after the six-month threshold", () => {
        const event = listen("artist", "artist", 1_000);

        expect(
            project(
                chainCatalog(),
                [event],
                1_000 + ARTIST_INACTIVITY_THRESHOLD_MS - 1
            ).getActivity("artist", "artist")?.state
        ).toBe("active");
        expect(
            project(chainCatalog(), [event], 1_000 + ARTIST_INACTIVITY_THRESHOLD_MS).getActivity(
                "artist",
                "artist"
            )?.state
        ).toBe("inactive");
        expect(
            project(chainCatalog(), [event], 1_001 + ARTIST_INACTIVITY_THRESHOLD_MS).getActivity(
                "artist",
                "artist"
            )?.state
        ).toBe("inactive");
    });

    it("reactivates an inactive Artist from a later Track without retaining prior state", () => {
        const first = listen("artist", "artist", 0);
        const inactiveAt = ARTIST_INACTIVITY_THRESHOLD_MS;
        const reactivationAt = inactiveAt + 100;
        const history = [first, listen("track", "track", reactivationAt, "reactivation")];

        expect(
            project(chainCatalog(), history, inactiveAt).getActivity("artist", "artist")?.state
        ).toBe("inactive");
        expect(
            project(chainCatalog(), history, reactivationAt).getActivity("artist", "artist")?.state
        ).toBe("active");
        expect(
            project(chainCatalog(), history, reactivationAt).getActivity("artist", "artist")
                ?.lastActivityAt
        ).toBe(reactivationAt);
    });

    it("keeps an inactive Artist present in the independent presence snapshot", () => {
        const history = new ListeningHistory([listen("artist", "artist", 0)]);
        const at = ARTIST_INACTIVITY_THRESHOLD_MS;
        const presence = presenceProjector.project({
            catalog: chainCatalog(),
            listeningHistory: history,
            at,
        });
        const activity = activityProjector.project({
            catalog: chainCatalog(),
            listeningHistory: history,
            at,
        });

        expect(
            presence
                .getCatalog()
                .getEntities()
                .some(({ kind, id }) => kind === "artist" && id === "artist")
        ).toBe(true);
        expect(activity.getActivity("artist", "artist")?.state).toBe("inactive");
    });

    it("is canonical across entity, relation and event permutations", () => {
        const catalog = multiParentCatalog();
        const events = [listen("track", "track", 20), listen("artist", "artist-a", 10, "earlier")];
        const permuted = new MusicCatalog(
            [...catalog.getEntities()].reverse(),
            [...catalog.getRelations()].reverse()
        );

        expect(signature(project(permuted, [...events].reverse(), 20))).toEqual(
            signature(project(catalog, events, 20))
        );
    });

    it("reconstructs T3 identically after visiting T1 and T2", () => {
        const history = new ListeningHistory([
            listen("artist", "artist", 10),
            listen("album", "album", 20, "album"),
            listen("track", "track", 30, "track"),
        ]);
        const direct = activityProjector.project({
            catalog: chainCatalog(),
            listeningHistory: history,
            at: 30,
        });

        activityProjector.project({ catalog: chainCatalog(), listeningHistory: history, at: 10 });
        activityProjector.project({ catalog: chainCatalog(), listeningHistory: history, at: 20 });
        const navigated = activityProjector.project({
            catalog: chainCatalog(),
            listeningHistory: history,
            at: 30,
        });

        expect(signature(navigated)).toEqual(signature(direct));
    });

    it("does not propagate wrong-kind, inverse or non-structural relations", () => {
        const catalog = new MusicCatalog(
            [entity("artist", "artist"), entity("album", "album"), entity("track", "track")],
            [
                relation("inverse", "track", "track", "contains", "album", "album"),
                relation("wrong-kind", "artist", "artist", "contains", "track", "track"),
                relation("non-structural", "artist", "artist", "influenced", "album", "album"),
            ]
        );

        expect(activityIdentities(project(catalog, [listen("track", "track", 10)], 10))).toEqual([
            "track:track",
        ]);
    });

    it("validates the rules version and explicit safe-integer T without fallback", () => {
        expect(
            () =>
                new MusicActivityProjector({
                    rulesVersion: "music-activity-v2" as MusicActivityRulesVersion,
                })
        ).toThrow("Unsupported Music activity rules version");
        expect(() => project(chainCatalog(), [], 1.5)).toThrow(RangeError);
    });

    it("returns immutable canonical snapshots and defensive activity arrays", () => {
        const snapshot = project(chainCatalog(), [listen("track", "track", 10)], 10);
        const first = snapshot.getActivities();
        const second = snapshot.getActivities();

        expect(first).not.toBe(second);
        expect(Object.isFrozen(first)).toBe(true);
        expect(Object.isFrozen(first[0])).toBe(true);
        expect(activityIdentities(snapshot)).toEqual([
            "album:album",
            "artist:artist",
            "genre:genre",
            "track:track",
        ]);
    });

    it("has no CurrentBroadcast input and does not infer activity from broadcasts", () => {
        expect(Object.keys(activityProjector)).not.toContain("currentBroadcast");
        expect(project(chainCatalog(), [], 10).getActivities()).toEqual([]);
    });
});

function project(catalog: MusicCatalog, events: readonly ListeningEvent[], at: number) {
    return activityProjector.project({
        catalog,
        listeningHistory: new ListeningHistory(events),
        at,
    });
}

function activityIdentities(snapshot: ReturnType<typeof project>): string[] {
    return snapshot
        .getActivities()
        .map(({ musicEntityKind, musicEntityId }) => `${musicEntityKind}:${musicEntityId}`);
}

function signature(snapshot: ReturnType<typeof project>): readonly object[] {
    return snapshot.getActivities().map((activity) => ({ ...activity }));
}

function listen(
    musicEntityKind: MusicEntityKind,
    musicEntityId: string,
    occurredAt: number,
    id = `listen-${musicEntityKind}-${musicEntityId}`
): ListeningEvent {
    return new ListeningEvent({ id, musicEntityKind, musicEntityId, occurredAt });
}

function entity(kind: MusicEntityKind, id: string): MusicEntity {
    if (kind === "album" || kind === "track") return new MusicEntity({ kind, id, title: id });
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
            entity("genre", "genre"),
            entity("artist", "artist"),
            entity("album", "album"),
            entity("track", "track"),
            entity("label", "label"),
            entity("playlist", "playlist"),
            entity("compilation", "compilation"),
        ],
        [
            relation("genre-artist", "genre", "genre", "includes", "artist", "artist"),
            relation("artist-album", "artist", "artist", "performed", "album", "album"),
            relation("album-track", "album", "album", "contains", "track", "track"),
            relation("label-album", "label", "label", "released", "album", "album"),
            relation("playlist-track", "playlist", "playlist", "contains", "track", "track"),
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
            entity("track", "track"),
        ],
        [
            relation("ga-aa", "genre", "genre-a", "includes", "artist", "artist-a"),
            relation("gb-ab", "genre", "genre-b", "includes", "artist", "artist-b"),
            relation("aa-ala", "artist", "artist-a", "performed", "album", "album-a"),
            relation("ab-alb", "artist", "artist-b", "performed", "album", "album-b"),
            relation("ala-t", "album", "album-a", "contains", "track", "track"),
            relation("alb-t", "album", "album-b", "contains", "track", "track"),
        ]
    );
}
