export type JsonTestObject = Record<string, unknown>;

export function minimalDocument(): JsonTestObject {
    return {
        metadata: { version: "1.0" },
        artists: [],
        albums: [],
        tracks: [],
        labels: [],
        playlists: [],
        relations: [],
    };
}

export function referenceDocument(): JsonTestObject {
    return {
        metadata: {
            version: "1.0",
            title: "Music Atlas",
            owner: "Mat",
            generatedAt: "2026-08-07T12:00:00Z",
            seed: 123456,
            locale: "fr",
        },
        artists: [
            {
                id: "artist-radiohead",
                name: "Radiohead",
                country: "UK",
                formed: 1985,
                tags: ["alternative", "experimental"],
            },
        ],
        albums: [{ id: "album-ok-computer", title: "OK Computer", year: 1997, duration: 3201 }],
        tracks: [
            {
                id: "track-paranoid-android",
                title: "Paranoid Android",
                duration: 385,
                trackNumber: 2,
            },
        ],
        labels: [{ id: "label-parlophone", name: "Parlophone" }],
        playlists: [{ id: "playlist-favorites", name: "Favorites" }],
        relations: [
            {
                id: "relation:performed",
                kind: "performed",
                source: { kind: "artist", id: "artist-radiohead" },
                target: { kind: "album", id: "album-ok-computer" },
                weight: 2,
            },
            {
                id: "relation:released-by",
                kind: "released-by",
                source: { kind: "album", id: "album-ok-computer" },
                target: { kind: "label", id: "label-parlophone" },
            },
            {
                id: "relation:contains-track",
                kind: "contains",
                source: { kind: "album", id: "album-ok-computer" },
                target: { kind: "track", id: "track-paranoid-android" },
            },
            {
                id: "relation:playlist-entry",
                kind: "contains",
                source: { kind: "playlist", id: "playlist-favorites" },
                target: { kind: "album", id: "album-ok-computer" },
            },
        ],
    };
}

export function objectAt(value: unknown): JsonTestObject {
    return value as JsonTestObject;
}
