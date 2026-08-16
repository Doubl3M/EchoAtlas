import { describe, expect, it } from "vitest";

import {
    MusicGeographicAppearanceInterpreter,
    MusicGeographicInterpreter,
    type MusicGeographicAppearanceVersion,
} from "../../src/app";
import {
    ListeningEvent,
    ListeningHistory,
    MusicActivity,
    MusicActivityProjector,
    MusicActivitySnapshot,
    MusicCatalog,
    MusicEntity,
    MusicInterpreter,
    MusicRelation,
    TemporalMusicProjector,
    musicKnowledgeNodeId,
    type MusicEntityKind,
} from "../../src/music";
import { GeographicFeature, GeographicHierarchy } from "../../src/world";

const appearanceInterpreter = new MusicGeographicAppearanceInterpreter();
const APPEARANCE_VERSION = "music-geographic-appearance-v1";
const INACTIVITY_THRESHOLD = 15_552_000_000;

describe("MusicGeographicAppearanceInterpreter", () => {
    it("keeps every District normal for an active Artist", () => {
        expect(
            interpret(activity("artist", "artist", "active"), artistHierarchy()).getAppearances()
        ).toEqual([]);
    });

    it("marks every represented District of an inactive Artist as ruined", () => {
        const snapshot = interpret(activity("artist", "artist", "inactive"), artistHierarchy());

        expect(
            snapshot.getAppearances().map(({ featureId, condition }) => [featureId, condition])
        ).toEqual([
            ["district-a", "ruined"],
            ["district-b", "ruined"],
        ]);
    });

    it("does nothing when an inactive Artist has no District", () => {
        const hierarchy = new GeographicHierarchy({
            features: [
                new GeographicFeature({
                    id: "building",
                    role: "building",
                    sourceKnowledgeNodeId: musicKnowledgeNodeId("artist", "artist"),
                }),
            ],
        });

        expect(
            interpret(activity("artist", "artist", "inactive"), hierarchy).getAppearances()
        ).toEqual([]);
    });

    it.each([
        ["album", "album"],
        ["track", "track"],
        ["genre", "genre"],
    ] as const)("creates no direct appearance from %s activity", (kind, id) => {
        expect(interpret(activity(kind, id), artistHierarchy()).getAppearances()).toEqual([]);
    });

    it("is independent from containment depth and affects only District roles", () => {
        const artistNodeId = musicKnowledgeNodeId("artist", "artist");
        const hierarchy = new GeographicHierarchy({
            features: [
                new GeographicFeature({ id: "root", role: "continent" }),
                new GeographicFeature({
                    id: "intermediate",
                    role: "building",
                    parentId: "root",
                }),
                new GeographicFeature({
                    id: "deep-district",
                    role: "district",
                    parentId: "intermediate",
                    sourceKnowledgeNodeId: artistNodeId,
                }),
                new GeographicFeature({
                    id: "same-source-building",
                    role: "building",
                    parentId: "deep-district",
                    sourceKnowledgeNodeId: artistNodeId,
                }),
            ],
        });

        expect(
            interpret(activity("artist", "artist", "inactive"), hierarchy)
                .getAppearances()
                .map(({ featureId }) => featureId)
        ).toEqual(["deep-district"]);
    });

    it("reconstructs deterministic snapshots without mutating prior appearances", () => {
        const inactive = interpret(activity("artist", "artist", "inactive"), artistHierarchy());
        const repeated = interpret(activity("artist", "artist", "inactive"), artistHierarchy());
        const reactivated = interpret(activity("artist", "artist", "active"), artistHierarchy());

        expect(repeated.getAppearances()).toEqual(inactive.getAppearances());
        expect(reactivated.getAppearances()).toEqual([]);
        expect(inactive.getAppearances()).toHaveLength(2);
    });

    it("rejects unknown interpretation versions without fallback", () => {
        expect(() =>
            appearanceInterpreter.interpret({
                activity: activity("artist", "artist", "inactive"),
                hierarchy: artistHierarchy(),
                version: "music-geographic-appearance-v2" as MusicGeographicAppearanceVersion,
            })
        ).toThrow("Unsupported Music geographic appearance version");
    });

    it("reconstructs present, inactive and reactivated states with one stable District identity", () => {
        const catalog = chainCatalog();
        const firstAt = 1_000;
        const inactiveAt = firstAt + INACTIVITY_THRESHOLD;
        const reactivatedAt = inactiveAt + 1;
        const history = new ListeningHistory([
            listen("track", "track", firstAt, "first"),
            listen("track", "track", reactivatedAt, "reactivation"),
        ]);

        const first = completeSnapshot(catalog, history, firstAt);
        const inactive = completeSnapshot(catalog, history, inactiveAt);
        const reactivated = completeSnapshot(catalog, history, reactivatedAt);

        expect(first).toMatchObject({ artistPresent: true, artistState: "active" });
        expect(first.appearance).toBeUndefined();
        expect(inactive).toMatchObject({ artistPresent: true, artistState: "inactive" });
        expect(inactive.appearance?.condition).toBe("ruined");
        expect(reactivated).toMatchObject({ artistPresent: true, artistState: "active" });
        expect(reactivated.appearance).toBeUndefined();
        expect(inactive.districtId).toBe(first.districtId);
        expect(reactivated.districtId).toBe(first.districtId);
    });
});

function interpret(activitySnapshot: MusicActivitySnapshot, hierarchy: GeographicHierarchy) {
    return appearanceInterpreter.interpret({
        activity: activitySnapshot,
        hierarchy,
        version: APPEARANCE_VERSION,
    });
}

function activity(
    musicEntityKind: MusicEntityKind,
    musicEntityId: string,
    state?: "active" | "inactive"
): MusicActivitySnapshot {
    return new MusicActivitySnapshot(10, "music-activity-v1", [
        new MusicActivity({ musicEntityKind, musicEntityId, lastActivityAt: 1, state }),
    ]);
}

function artistHierarchy(): GeographicHierarchy {
    const sourceKnowledgeNodeId = musicKnowledgeNodeId("artist", "artist");
    return new GeographicHierarchy({
        features: [
            new GeographicFeature({ id: "district-b", role: "district", sourceKnowledgeNodeId }),
            new GeographicFeature({ id: "district-a", role: "district", sourceKnowledgeNodeId }),
        ],
    });
}

function completeSnapshot(catalog: MusicCatalog, history: ListeningHistory, at: number) {
    const temporal = new TemporalMusicProjector({
        rulesVersion: "temporal-music-presence-v1",
    }).project({
        catalog,
        listeningHistory: history,
        at,
    });
    const graph = new MusicInterpreter().interpret(temporal.getCatalog());
    const hierarchy = new MusicGeographicInterpreter().interpret({
        catalog: temporal.getCatalog(),
        knowledgeGraph: graph,
        version: "music-geography-v1",
    });
    const activitySnapshot = new MusicActivityProjector({
        rulesVersion: "music-activity-v1",
    }).project({
        catalog,
        listeningHistory: history,
        at,
    });
    const appearance = interpret(activitySnapshot, hierarchy);
    const district = hierarchy
        .getFeaturesByKnowledgeNodeId(musicKnowledgeNodeId("artist", "artist"))
        .find(({ role }) => role === "district");

    return {
        artistPresent: temporal
            .getCatalog()
            .getEntities()
            .some(({ kind, id }) => kind === "artist" && id === "artist"),
        artistState: activitySnapshot.getActivity("artist", "artist")?.state,
        districtId: district?.id,
        appearance: district === undefined ? undefined : appearance.getAppearance(district.id),
    };
}

function chainCatalog(): MusicCatalog {
    return new MusicCatalog(
        [
            entity("genre", "genre"),
            entity("artist", "artist"),
            entity("album", "album"),
            entity("track", "track"),
        ],
        [
            relation("genre-artist", "genre", "genre", "includes", "artist", "artist"),
            relation("artist-album", "artist", "artist", "performed", "album", "album"),
            relation("album-track", "album", "album", "contains", "track", "track"),
        ]
    );
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

function listen(
    musicEntityKind: MusicEntityKind,
    musicEntityId: string,
    occurredAt: number,
    id: string
): ListeningEvent {
    return new ListeningEvent({ id, musicEntityKind, musicEntityId, occurredAt });
}
