import { describe, expect, it } from "vitest";

import { MusicEntity } from "../../src/music";

describe("MusicEntity", () => {
    it.each(["artist", "album", "track", "label", "genre", "playlist", "compilation"] as const)(
        "supports the %s category",
        (kind) => {
            const entity = new MusicEntity({ id: "canonical-id", kind });

            expect(entity).toEqual({
                id: "canonical-id",
                kind,
                name: undefined,
                title: undefined,
                country: undefined,
                formed: undefined,
                tags: undefined,
                year: undefined,
                duration: undefined,
                trackNumber: undefined,
                weight: 1,
            });
            expect(Object.isFrozen(entity)).toBe(true);
        }
    );

    it("preserves exact valid identities and explicit weights", () => {
        const entity = new MusicEntity({ id: "Björk:Álbum", kind: "album", weight: 4.5 });

        expect(entity.id).toBe("Björk:Álbum");
        expect(entity.weight).toBe(4.5);
    });

    it.each([0, -3.25])("preserves the finite weight %s without normalization", (weight) => {
        expect(new MusicEntity({ id: "weighted", kind: "artist", weight }).weight).toBe(weight);
    });

    it("preserves canonical names and titles in the music domain", () => {
        const artist = new MusicEntity({ id: "bjork", kind: "artist", name: "Björk" });
        const album = new MusicEntity({ id: "vespertine", kind: "album", title: "Vespertine" });

        expect(artist.name).toBe("Björk");
        expect(album.title).toBe("Vespertine");
    });

    it("preserves every typed artist attribute", () => {
        const sourceTags = ["Électronique", "e\u0301lectronique"];
        const artist = new MusicEntity({
            id: "bjork",
            kind: "artist",
            name: "Björk",
            country: "Ísland",
            formed: 1977,
            tags: sourceTags,
        });
        sourceTags[0] = "mutated";
        sourceTags.push("new");

        expect(artist).toMatchObject({
            name: "Björk",
            country: "Ísland",
            formed: 1977,
            tags: ["Électronique", "e\u0301lectronique"],
        });
        expect(Object.isFrozen(artist.tags)).toBe(true);
        expect(() => (artist.tags as string[]).push("forbidden")).toThrow(TypeError);
    });

    it("preserves every typed album attribute", () => {
        const album = new MusicEntity({
            id: "vespertine",
            kind: "album",
            title: "Vespertine",
            year: 2001,
            duration: 3301.5,
        });

        expect(album).toMatchObject({ title: "Vespertine", year: 2001, duration: 3301.5 });
    });

    it("preserves every typed track attribute", () => {
        const track = new MusicEntity({
            id: "hidden-place",
            kind: "track",
            title: "Hidden Place",
            duration: 328,
            trackNumber: 1,
        });

        expect(track).toMatchObject({ title: "Hidden Place", duration: 328, trackNumber: 1 });
    });

    it("preserves label and playlist names", () => {
        const label = new MusicEntity({ id: "one-little", kind: "label", name: "One Little" });
        const playlist = new MusicEntity({ id: "favourites", kind: "playlist", name: "Favoris" });

        expect(label.name).toBe("One Little");
        expect(playlist.name).toBe("Favoris");
    });

    it.each([
        ["name", " artist"],
        ["title", "album "],
        ["name", ""],
    ] as const)("rejects an invalid %s", (property, value) => {
        expect(() => new MusicEntity({ id: "id", kind: "artist", [property]: value })).toThrow(
            TypeError
        );
    });

    it("preserves distinct Unicode representations without normalization", () => {
        const composed = new MusicEntity({ id: "é", kind: "artist" });
        const decomposed = new MusicEntity({ id: "e\u0301", kind: "artist" });

        expect(composed.id).toBe("é");
        expect(decomposed.id).toBe("e\u0301");
        expect(composed.id).not.toBe(decomposed.id);
    });

    it.each(["", " ", " UK", "UK "])("rejects the invalid country %j", (country) => {
        expect(() => new MusicEntity({ id: "id", kind: "artist", country })).toThrow(TypeError);
    });

    it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid formed year %s",
        (formed) => {
            expect(() => new MusicEntity({ id: "id", kind: "artist", formed })).toThrow(RangeError);
        }
    );

    it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid album year %s",
        (year) => {
            expect(() => new MusicEntity({ id: "id", kind: "album", year })).toThrow(RangeError);
        }
    );

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid duration %s",
        (duration) => {
            expect(() => new MusicEntity({ id: "id", kind: "track", duration })).toThrow(
                RangeError
            );
        }
    );

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid track number %s",
        (trackNumber) => {
            expect(() => new MusicEntity({ id: "id", kind: "track", trackNumber })).toThrow(
                RangeError
            );
        }
    );

    it.each(["", " tag", "tag "])("rejects the invalid tag %j", (tag) => {
        expect(() => new MusicEntity({ id: "id", kind: "artist", tags: [tag] })).toThrow(TypeError);
    });

    it("rejects a non-array tags value at runtime", () => {
        expect(
            () =>
                new MusicEntity({
                    id: "id",
                    kind: "artist",
                    tags: "tag",
                } as unknown as ConstructorParameters<typeof MusicEntity>[0])
        ).toThrow("Music artist tags must be an array.");
    });

    it.each([
        ["album", { country: "UK" }],
        ["artist", { duration: 10 }],
        ["track", { formed: 1990 }],
        ["label", { year: 1990 }],
        ["playlist", { title: "Title" }],
        ["genre", { trackNumber: 1 }],
        ["compilation", { tags: ["tag"] }],
    ] as const)("rejects attributes incompatible with %s", (kind, attributes) => {
        expect(
            () =>
                new MusicEntity({
                    id: "id",
                    kind,
                    ...attributes,
                } as unknown as ConstructorParameters<typeof MusicEntity>[0])
        ).toThrow(`Music ${kind} does not support`);
    });

    it.each(["", " ", " artist", "artist ", "\tartist"])("rejects invalid IDs %j", (id) => {
        expect(() => new MusicEntity({ id, kind: "artist" })).toThrow(TypeError);
    });

    it("rejects unsupported categories", () => {
        expect(() => new MusicEntity({ id: "id", kind: "city" as "artist" })).toThrow(TypeError);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects non-finite weights",
        (weight) => {
            expect(() => new MusicEntity({ id: "id", kind: "artist", weight })).toThrow(RangeError);
        }
    );
});
