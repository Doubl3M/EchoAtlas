import { describe, expect, it } from "vitest";

import { MusicJsonImportError, MusicJsonImporter } from "../../../src/music/import";
import { minimalDocument, objectAt, referenceDocument } from "./fixtures";

const importer = new MusicJsonImporter();

describe("MusicJsonImporter", () => {
    it("imports the minimal canonical document", () => {
        const imported = importer.import(minimalDocument());

        expect(imported.metadata).toEqual({
            version: "1.0",
            title: undefined,
            owner: undefined,
            generatedAt: undefined,
            seed: undefined,
            locale: undefined,
        });
        expect(imported.catalog.getEntities()).toEqual([]);
        expect(imported.catalog.getRelations()).toEqual([]);
        expect(Object.isFrozen(imported)).toBe(true);
        expect(Object.isFrozen(imported.metadata)).toBe(true);
    });

    it("imports every canonical V1 field without loss", () => {
        const imported = importer.import(referenceDocument());

        expect(imported.metadata).toEqual({
            version: "1.0",
            title: "Music Atlas",
            owner: "Mat",
            generatedAt: "2026-08-07T12:00:00Z",
            seed: 123456,
            locale: "fr",
        });
        expect(imported.catalog.getEntities()).toMatchObject([
            {
                kind: "artist",
                id: "artist-radiohead",
                name: "Radiohead",
                country: "UK",
                formed: 1985,
                tags: ["alternative", "experimental"],
            },
            {
                kind: "album",
                id: "album-ok-computer",
                title: "OK Computer",
                year: 1997,
                duration: 3201,
            },
            {
                kind: "track",
                id: "track-paranoid-android",
                title: "Paranoid Android",
                duration: 385,
                trackNumber: 2,
            },
            { kind: "label", id: "label-parlophone", name: "Parlophone" },
            { kind: "playlist", id: "playlist-favorites", name: "Favorites" },
        ]);
        expect(imported.catalog.getRelations().map(({ id, weight }) => ({ id, weight }))).toEqual([
            { id: "relation:performed", weight: 2 },
            { id: "relation:released-by", weight: 1 },
            { id: "relation:contains-track", weight: 1 },
            { id: "relation:playlist-entry", weight: 1 },
        ]);
    });

    it("parses JSON text through the same validation boundary", () => {
        const imported = importer.parse(JSON.stringify(referenceDocument()));

        expect(imported.metadata.seed).toBe(123456);
        expect(imported.catalog.getEntities()).toHaveLength(5);
    });

    it("reports a stable syntax error without exposing the engine message", () => {
        expect(() => importer.parse("{")).toThrowError(
            new MusicJsonImportError("syntax", "$", "invalid JSON syntax")
        );
    });

    it("rejects non-text input passed dynamically to parse", () => {
        expect(() => importer.parse(42 as unknown as string)).toThrowError(
            new MusicJsonImportError("validation", "$", "expected JSON text")
        );
    });

    it("does not retain mutable input references", () => {
        const source = referenceDocument();
        const metadata = objectAt(source.metadata);
        const artists = source.artists as unknown[];
        const artist = objectAt(artists[0]);
        const sourceTags = artist.tags as string[];
        const imported = importer.import(source);

        metadata.title = "Changed";
        sourceTags[0] = "changed";
        artists.length = 0;

        expect(imported.metadata.title).toBe("Music Atlas");
        expect(imported.catalog.getEntities()[0]?.tags).toEqual(["alternative", "experimental"]);
        expect(imported.catalog.getEntities()).toHaveLength(5);
    });

    it("preserves Unicode exactly without normalization", () => {
        const source = minimalDocument();
        source.artists = [{ id: "é", name: "Björk", country: "Ísland", tags: ["e\u0301"] }];
        const entity = importer.import(source).catalog.getEntities()[0];

        expect(entity?.id).toBe("é");
        expect(entity?.name).toBe("Björk");
        expect(entity?.country).toBe("Ísland");
        expect(entity?.tags).toEqual(["e\u0301"]);
        expect(entity?.tags?.[0]).not.toBe("é");
    });

    it("resolves identical canonical IDs by kind", () => {
        const source = minimalDocument();
        source.artists = [{ id: "42", name: "Artist" }];
        source.albums = [{ id: "42", title: "Album" }];
        source.relations = [
            {
                id: "artist-to-album",
                kind: "performed",
                source: { kind: "artist", id: "42" },
                target: { kind: "album", id: "42" },
            },
        ];
        const imported = importer.import(source);

        expect(imported.catalog.getRelations()[0]).toMatchObject({
            sourceKind: "artist",
            sourceId: "42",
            targetKind: "album",
            targetId: "42",
        });
    });

    it.each([0, -2.5])("preserves the finite relation weight %s", (weight) => {
        const source = minimalDocument();
        source.artists = [{ id: "a", name: "A" }];
        source.relations = [
            {
                id: "r",
                kind: "self",
                source: { kind: "artist", id: "a" },
                target: { kind: "artist", id: "a" },
                weight,
            },
        ];

        expect(importer.import(source).catalog.getRelations()[0]?.weight).toBe(weight);
    });
});
