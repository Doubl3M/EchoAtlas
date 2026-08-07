import { describe, expect, it } from "vitest";

import { MusicJsonImportError, MusicJsonImporter } from "../../../src/music/import";
import type { JsonTestObject } from "./fixtures";
import { minimalDocument, objectAt } from "./fixtures";

const importer = new MusicJsonImporter();

function expectValidation(value: unknown, path: string, reason?: string): void {
    try {
        importer.import(value);
        throw new Error("Expected import to fail.");
    } catch (error: unknown) {
        expect(error).toBeInstanceOf(MusicJsonImportError);
        const importError = error as MusicJsonImportError;
        expect(importError.category).toBe("validation");
        expect(importError.path).toBe(path);
        expect(importError.message).toBe(`${path}: ${importError.reason}`);
        expect(Object.isFrozen(importError)).toBe(true);
        if (reason !== undefined) {
            expect(importError.reason).toBe(reason);
        }
    }
}

describe("Music JSON V1 structural validation", () => {
    it.each([
        [null, "$"],
        [[], "$"],
        ["document", "$"],
    ] as const)("rejects invalid roots", (value, path) => {
        expectValidation(value, path);
    });

    it.each(["metadata", "artists", "albums", "tracks", "labels", "playlists", "relations"])(
        "requires the root field %s",
        (field) => {
            const source = minimalDocument();
            Reflect.deleteProperty(source, field);

            expectValidation(source, `$.${field}`, "missing required field");
        }
    );

    it.each(["unknown", "listens", "settings", "genres", "compilations"])(
        "rejects the unsupported root field %s",
        (field) => {
            const source = minimalDocument();
            source[field] = [];

            expectValidation(source, `$.${field}`, "unknown field");
        }
    );

    it.each(["artists", "albums", "tracks", "labels", "playlists", "relations"])(
        "requires %s to be an array",
        (field) => {
            const source = minimalDocument();
            source[field] = {};

            expectValidation(source, `$.${field}`, "expected array");
        }
    );

    it("rejects sparse arrays supplied through the unknown API", () => {
        const source = minimalDocument();
        source.artists = new Array(1);

        expectValidation(source, "$.artists[0]", "missing array value");
    });
});

describe("Music JSON V1 metadata validation", () => {
    it.each([undefined, null, {}, { version: "2.0" }, { version: 1 }])(
        "rejects invalid metadata %j",
        (metadata) => {
            const source = minimalDocument();
            source.metadata = metadata;
            const path =
                metadata === undefined || metadata === null ? "$.metadata" : "$.metadata.version";

            expectValidation(source, path);
        }
    );

    it("rejects unknown metadata fields", () => {
        const source = minimalDocument();
        objectAt(source.metadata).extra = true;

        expectValidation(source, "$.metadata.extra", "unknown field");
    });

    it("rejects explicit undefined instead of treating it as an absent optional field", () => {
        const source = minimalDocument();
        objectAt(source.metadata).title = undefined;

        expectValidation(source, "$.metadata.title", "undefined is not a JSON value");
    });

    it.each(["title", "owner", "locale"])("validates metadata text %s", (field) => {
        const source = minimalDocument();
        objectAt(source.metadata)[field] = " invalid ";

        expectValidation(source, `$.metadata.${field}`);
    });

    it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
        "rejects invalid seeds %s",
        (seed) => {
            const source = minimalDocument();
            objectAt(source.metadata).seed = seed;

            expectValidation(source, "$.metadata.seed", "expected safe integer");
        }
    );

    it.each([
        "2026-02-29T12:00:00Z",
        "2024-13-01T00:00:00Z",
        "2024-01-01 00:00:00Z",
        "2024-01-01T24:00:00Z",
        "2024-01-01T00:00:00+24:00",
        "not-a-date",
    ])("rejects invalid RFC 3339 date-time %s", (generatedAt) => {
        const source = minimalDocument();
        objectAt(source.metadata).generatedAt = generatedAt;

        expectValidation(source, "$.metadata.generatedAt", "expected an RFC 3339 date-time");
    });

    it.each(["2024-02-29T23:59:59Z", "2026-08-07T12:00:00.123+02:30", "2000-01-01T00:00:00-05:00"])(
        "accepts deterministic RFC 3339 date-time %s",
        (generatedAt) => {
            const source = minimalDocument();
            objectAt(source.metadata).generatedAt = generatedAt;

            expect(importer.import(source).metadata.generatedAt).toBe(generatedAt);
        }
    );
});

describe("Music JSON V1 entity validation", () => {
    const cases: readonly [string, JsonTestObject, string][] = [
        ["artists", { id: "a", name: "A" }, "name"],
        ["albums", { id: "a", title: "A" }, "title"],
        ["tracks", { id: "t", title: "T" }, "title"],
        ["labels", { id: "l", name: "L" }, "name"],
        ["playlists", { id: "p", name: "P" }, "name"],
    ];

    it.each(cases)("requires mandatory %s fields", (collection, entity, requiredField) => {
        const invalidEntity = { ...entity };
        Reflect.deleteProperty(invalidEntity, requiredField);
        const source = minimalDocument();
        source[collection] = [invalidEntity];

        expectValidation(source, `$.${collection}[0].${requiredField}`, "missing required field");
    });

    it.each(cases)("rejects non-object %s entries", (collection) => {
        const source = minimalDocument();
        source[collection] = [null];

        expectValidation(source, `$.${collection}[0]`);
    });

    it.each(cases)("rejects unknown %s fields", (collection, entity) => {
        const source = minimalDocument();
        source[collection] = [{ ...entity, extra: true }];

        expectValidation(source, `$.${collection}[0].extra`, "unknown field");
    });

    it.each(["", " id", "id ", 42])("rejects invalid entity IDs %j", (id) => {
        const source = minimalDocument();
        source.artists = [{ id, name: "Artist" }];

        expectValidation(source, "$.artists[0].id");
    });

    it.each(["", " name", "name ", null])("rejects invalid names %j", (name) => {
        const source = minimalDocument();
        source.labels = [{ id: "label", name }];

        expectValidation(source, "$.labels[0].name");
    });

    it.each(["", " title", "title ", null])("rejects invalid titles %j", (title) => {
        const source = minimalDocument();
        source.albums = [{ id: "album", title }];

        expectValidation(source, "$.albums[0].title");
    });

    it.each(["", " UK", "UK ", 1])("rejects invalid countries %j", (country) => {
        const source = minimalDocument();
        source.artists = [{ id: "artist", name: "Artist", country }];

        expectValidation(source, "$.artists[0].country");
    });

    it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid formed/year values %s",
        (value) => {
            const artistSource = minimalDocument();
            artistSource.artists = [{ id: "a", name: "A", formed: value }];
            expectValidation(artistSource, "$.artists[0].formed");

            const albumSource = minimalDocument();
            albumSource.albums = [{ id: "a", title: "A", year: value }];
            expectValidation(albumSource, "$.albums[0].year");
        }
    );

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid durations %s",
        (duration) => {
            const source = minimalDocument();
            source.albums = [{ id: "a", title: "A", duration }];

            expectValidation(source, "$.albums[0].duration");
        }
    );

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid track numbers %s",
        (trackNumber) => {
            const source = minimalDocument();
            source.tracks = [{ id: "t", title: "T", trackNumber }];

            expectValidation(source, "$.tracks[0].trackNumber");
        }
    );

    it.each(["tag", [""], [" tag"], [42]])("rejects invalid tags %j", (tags) => {
        const source = minimalDocument();
        source.artists = [{ id: "a", name: "A", tags }];

        const path = Array.isArray(tags) ? "$.artists[0].tags[0]" : "$.artists[0].tags";
        expectValidation(source, path);
    });

    it.each(["artists", "albums", "tracks", "labels", "playlists"])(
        "rejects duplicate IDs in %s",
        (collection) => {
            const entityByCollection: Record<string, JsonTestObject> = {
                artists: { id: "same", name: "A" },
                albums: { id: "same", title: "A" },
                tracks: { id: "same", title: "T" },
                labels: { id: "same", name: "L" },
                playlists: { id: "same", name: "P" },
            };
            const source = minimalDocument();
            source[collection] = [
                { ...entityByCollection[collection] },
                { ...entityByCollection[collection] },
            ];

            expectValidation(source, `$.${collection}[1].id`);
        }
    );

    it.each([
        ["albums", "artistId"],
        ["albums", "labelId"],
        ["tracks", "albumId"],
    ] as const)("rejects legacy %s.%s references", (collection, field) => {
        const source = minimalDocument();
        source[collection] = [
            collection === "albums"
                ? { id: "a", title: "A", [field]: "legacy" }
                : { id: "t", title: "T", [field]: "legacy" },
        ];

        expectValidation(source, `$.${collection}[0].${field}`, "unknown field");
    });
});

describe("Music JSON V1 relation validation", () => {
    function relatedDocument(): JsonTestObject {
        const source = minimalDocument();
        source.artists = [{ id: "a", name: "A" }];
        source.relations = [
            {
                id: "r",
                kind: "related",
                source: { kind: "artist", id: "a" },
                target: { kind: "artist", id: "a" },
            },
        ];
        return source;
    }

    it.each(["id", "kind", "source", "target"])("requires relation field %s", (field) => {
        const source = relatedDocument();
        Reflect.deleteProperty(objectAt((source.relations as unknown[])[0]), field);

        expectValidation(source, `$.relations[0].${field}`, "missing required field");
    });

    it("rejects non-object and unknown relation fields", () => {
        const nonObject = relatedDocument();
        nonObject.relations = [null];
        expectValidation(nonObject, "$.relations[0]");

        const unknown = relatedDocument();
        objectAt((unknown.relations as unknown[])[0]).extra = true;
        expectValidation(unknown, "$.relations[0].extra", "unknown field");
    });

    it.each(["", " kind", "kind "])("rejects invalid relation kinds %j", (kind) => {
        const source = relatedDocument();
        objectAt((source.relations as unknown[])[0]).kind = kind;

        expectValidation(source, "$.relations[0].kind");
    });

    it.each(["", " relation", "relation "])("rejects invalid relation IDs %j", (id) => {
        const source = relatedDocument();
        objectAt((source.relations as unknown[])[0]).id = id;

        expectValidation(source, "$.relations[0].id");
    });

    it("rejects duplicate relation IDs", () => {
        const source = relatedDocument();
        source.relations = [
            ...(source.relations as unknown[]),
            {
                id: "r",
                kind: "other",
                source: { kind: "artist", id: "a" },
                target: { kind: "artist", id: "a" },
            },
        ];

        expectValidation(source, "$.relations[1].id", "duplicate relation ID: r");
    });

    it.each(["genre", "compilation", "city", 1])("rejects endpoint kind %j", (kind) => {
        const source = relatedDocument();
        objectAt(objectAt((source.relations as unknown[])[0]).source).kind = kind;

        expectValidation(source, "$.relations[0].source.kind");
    });

    it.each(["source", "target"])("rejects unknown %s references", (endpoint) => {
        const source = relatedDocument();
        objectAt(objectAt((source.relations as unknown[])[0])[endpoint]).id = "missing";

        expectValidation(source, `$.relations[0].${endpoint}.id`);
    });

    it.each(["source", "target"])("rejects invalid %s endpoint objects", (endpoint) => {
        const source = relatedDocument();
        objectAt((source.relations as unknown[])[0])[endpoint] = null;

        expectValidation(source, `$.relations[0].${endpoint}`);
    });

    it.each(["kind", "id"])("requires endpoint field %s", (field) => {
        const source = relatedDocument();
        Reflect.deleteProperty(
            objectAt(objectAt((source.relations as unknown[])[0]).source),
            field
        );

        expectValidation(source, `$.relations[0].source.${field}`, "missing required field");
    });

    it("rejects unknown endpoint fields", () => {
        const source = relatedDocument();
        objectAt(objectAt((source.relations as unknown[])[0]).source).extra = true;

        expectValidation(source, "$.relations[0].source.extra", "unknown field");
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "1"])(
        "rejects invalid relation weights %s",
        (weight) => {
            const source = relatedDocument();
            objectAt((source.relations as unknown[])[0]).weight = weight;

            expectValidation(source, "$.relations[0].weight", "expected finite number");
        }
    );
});
