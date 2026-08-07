import { describe, expect, it } from "vitest";

import { MusicInterpreter } from "../../../src/music";
import { MusicJsonImporter } from "../../../src/music/import";
import { referenceDocument } from "./fixtures";

const importer = new MusicJsonImporter();

describe("JSON V1 to Knowledge Graph boundary", () => {
    it("preserves canonical identities, kinds, directions and weights", () => {
        const json = JSON.stringify(referenceDocument());
        const first = importer.parse(json);
        const second = importer.parse(json);
        const firstGraph = new MusicInterpreter().interpret(first.catalog);
        const secondGraph = new MusicInterpreter().interpret(second.catalog);

        expect(first.metadata.seed).toBe(123456);
        expect(firstGraph.getNodes()).toEqual([
            { id: "music:album:album-ok-computer", kind: "music:album", weight: 1 },
            { id: "music:artist:artist-radiohead", kind: "music:artist", weight: 1 },
            { id: "music:label:label-parlophone", kind: "music:label", weight: 1 },
            { id: "music:playlist:playlist-favorites", kind: "music:playlist", weight: 1 },
            { id: "music:track:track-paranoid-android", kind: "music:track", weight: 1 },
        ]);
        expect(firstGraph.getRelations()).toEqual([
            {
                id: "music:relation:relation:contains-track",
                sourceId: "music:album:album-ok-computer",
                targetId: "music:track:track-paranoid-android",
                kind: "music:contains",
                weight: 1,
            },
            {
                id: "music:relation:relation:performed",
                sourceId: "music:artist:artist-radiohead",
                targetId: "music:album:album-ok-computer",
                kind: "music:performed",
                weight: 2,
            },
            {
                id: "music:relation:relation:playlist-entry",
                sourceId: "music:playlist:playlist-favorites",
                targetId: "music:album:album-ok-computer",
                kind: "music:contains",
                weight: 1,
            },
            {
                id: "music:relation:relation:released-by",
                sourceId: "music:album:album-ok-computer",
                targetId: "music:label:label-parlophone",
                kind: "music:released-by",
                weight: 1,
            },
        ]);
        expect(secondGraph.getNodes()).toEqual(firstGraph.getNodes());
        expect(secondGraph.getRelations()).toEqual(firstGraph.getRelations());
        expect(firstGraph.getNode("music:metadata:123456")).toBeUndefined();
    });

    it("is independent of entity and relation input order", () => {
        const forward = referenceDocument();
        const reversed = referenceDocument();
        for (const collection of [
            "artists",
            "albums",
            "tracks",
            "labels",
            "playlists",
            "relations",
        ]) {
            reversed[collection] = [...(reversed[collection] as unknown[])].reverse();
        }

        const interpreter = new MusicInterpreter();
        const forwardGraph = interpreter.interpret(importer.import(forward).catalog);
        const reverseGraph = interpreter.interpret(importer.import(reversed).catalog);

        expect(reverseGraph.getNodes()).toEqual(forwardGraph.getNodes());
        expect(reverseGraph.getRelations()).toEqual(forwardGraph.getRelations());
    });
});
