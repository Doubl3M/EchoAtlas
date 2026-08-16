import { describe, expect, it } from "vitest";

import type {
    ListeningEventOptions,
    MusicEntityKind,
    MusicEntityOptions,
    MusicRelationOptions,
} from "../../src/music";
import { musicKnowledgeNodeId, musicKnowledgeNodeKind } from "../../src/music";

describe("music public API", () => {
    it("exports only the intended runtime symbols", async () => {
        const publicApi = await import("../../src/music");

        expect(Object.keys(publicApi).sort()).toEqual([
            "ListeningEvent",
            "ListeningHistory",
            "MusicCatalog",
            "MusicEntity",
            "MusicInterpreter",
            "MusicRelation",
            "musicKnowledgeNodeId",
            "musicKnowledgeNodeKind",
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

        expect(entity.kind).toBe("artist");
        expect(relation.kind).toBe("performed");
        expect(listeningEvent.occurredAt).toBe(1);
    });

    it("provides the canonical Music to Knowledge identity convention", () => {
        expect(musicKnowledgeNodeId("artist", "artist:prince")).toBe("music:artist:artist:prince");
        expect(musicKnowledgeNodeKind("album")).toBe("music:album");
    });
});
