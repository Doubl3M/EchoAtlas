import { describe, expect, it } from "vitest";

import type {
    ListeningEventOptions,
    MusicStructuralRelationDescriptor,
    MusicEntityKind,
    MusicEntityOptions,
    MusicRelationOptions,
    TemporalMusicProjectionInput,
    TemporalMusicProjectorOptions,
    TemporalMusicRulesVersion,
    MusicActivityOptions,
    MusicActivityProjectionInput,
    MusicActivityProjectorOptions,
    MusicActivityRulesVersion,
    MusicActivityState,
} from "../../src/music";
import {
    musicKnowledgeNodeId,
    musicKnowledgeNodeKind,
    musicKnowledgeRelationKind,
} from "../../src/music";

describe("music public API", () => {
    it("exports only the intended runtime symbols", async () => {
        const publicApi = await import("../../src/music");

        expect(Object.keys(publicApi).sort()).toEqual([
            "ListeningEvent",
            "ListeningHistory",
            "MusicActivity",
            "MusicActivityProjector",
            "MusicActivitySnapshot",
            "MusicCatalog",
            "MusicEntity",
            "MusicInterpreter",
            "MusicRelation",
            "TemporalMusicProjector",
            "TemporalMusicSnapshot",
            "composeMusicCatalogs",
            "getStructuralMusicRelationKindV1",
            "isStructuralMusicRelationV1",
            "musicKnowledgeNodeId",
            "musicKnowledgeNodeKind",
            "musicKnowledgeRelationKind",
        ]);
    });

    it("exports construction contracts as types only", () => {
        const kind: MusicEntityKind = "artist";
        const entity: MusicEntityOptions = { id: "a", kind };
        const relation: MusicRelationOptions = {
            id: "r",
            sourceId: "a",
            sourceKind: "artist",
            targetId: "b",
            targetKind: "album",
            kind: "performed",
        };
        const listeningEvent: ListeningEventOptions = {
            id: "listen-1",
            occurredAt: 1,
            musicEntityKind: "track",
            musicEntityId: "track-a",
        };
        const structuralRelation: MusicStructuralRelationDescriptor = {
            sourceKind: "album",
            relationKind: "contains",
            targetKind: "track",
        };
        const rulesVersion: TemporalMusicRulesVersion = "temporal-music-presence-v1";
        const projectorOptions: TemporalMusicProjectorOptions = { rulesVersion };
        const projectionInput = {} as TemporalMusicProjectionInput;
        const activityRulesVersion: MusicActivityRulesVersion = "music-activity-v1";
        const activityOptions: MusicActivityOptions = {
            musicEntityKind: "artist",
            musicEntityId: "artist-a",
            lastActivityAt: 1,
            state: "active",
        };
        const activityState: MusicActivityState = "inactive";
        const activityProjectorOptions: MusicActivityProjectorOptions = {
            rulesVersion: activityRulesVersion,
        };
        const activityProjectionInput = {} as MusicActivityProjectionInput;

        expect(entity.kind).toBe("artist");
        expect(relation.kind).toBe("performed");
        expect(listeningEvent.occurredAt).toBe(1);
        expect(structuralRelation.relationKind).toBe("contains");
        expect(projectorOptions.rulesVersion).toBe(rulesVersion);
        expect(projectionInput).toEqual({});
        expect(activityOptions.state).toBe("active");
        expect(activityState).toBe("inactive");
        expect(activityProjectorOptions.rulesVersion).toBe(activityRulesVersion);
        expect(activityProjectionInput).toEqual({});
    });

    it("provides the canonical Music to Knowledge identity convention", () => {
        expect(musicKnowledgeNodeId("artist", "artist:prince")).toBe("music:artist:artist:prince");
        expect(musicKnowledgeNodeKind("album")).toBe("music:album");
        expect(musicKnowledgeRelationKind("performed")).toBe("music:performed");
    });
});
