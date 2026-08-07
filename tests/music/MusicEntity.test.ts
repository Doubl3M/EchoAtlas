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
