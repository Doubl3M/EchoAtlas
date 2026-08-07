import { describe, expect, it } from "vitest";

import type { MusicEntityKind, MusicEntityOptions, MusicRelationOptions } from "../../src/music";

describe("music public API", () => {
    it("exports only the intended runtime symbols", async () => {
        const publicApi = await import("../../src/music");

        expect(Object.keys(publicApi).sort()).toEqual([
            "MusicCatalog",
            "MusicEntity",
            "MusicInterpreter",
            "MusicRelation",
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

        expect(entity.kind).toBe("artist");
        expect(relation.kind).toBe("performed");
    });
});
