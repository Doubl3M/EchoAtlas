/** Local JSON V1 fixture used only by the browser demonstration. */
export const demoMusicDocumentJson = `{
    "metadata": {
        "version": "1.0",
        "title": "EchoAtlas First Voyage",
        "owner": "EchoAtlas",
        "seed": 1977,
        "locale": "en"
    },
    "artists": [
        { "id": "stevie-wonder", "name": "Stevie Wonder", "country": "US", "formed": 1961 },
        { "id": "fleetwood-mac", "name": "Fleetwood Mac", "country": "UK", "formed": 1967 },
        { "id": "kraftwerk", "name": "Kraftwerk", "country": "DE", "formed": 1970 }
    ],
    "albums": [
        { "id": "songs-in-the-key-of-life", "title": "Songs in the Key of Life", "year": 1976 },
        { "id": "rumours", "title": "Rumours", "year": 1977 },
        { "id": "trans-europe-express", "title": "Trans-Europe Express", "year": 1977 }
    ],
    "tracks": [
        { "id": "sir-duke", "title": "Sir Duke", "trackNumber": 5 },
        { "id": "dreams", "title": "Dreams", "trackNumber": 2 },
        { "id": "europe-endless", "title": "Europe Endless", "trackNumber": 1 }
    ],
    "labels": [
        { "id": "motown", "name": "Motown" },
        { "id": "warner-bros", "name": "Warner Bros." }
    ],
    "playlists": [
        { "id": "night-drive", "name": "Night Drive" }
    ],
    "relations": [
        { "id": "stevie-songs", "kind": "created", "source": { "kind": "artist", "id": "stevie-wonder" }, "target": { "kind": "album", "id": "songs-in-the-key-of-life" }, "weight": 2 },
        { "id": "fleetwood-rumours", "kind": "created", "source": { "kind": "artist", "id": "fleetwood-mac" }, "target": { "kind": "album", "id": "rumours" }, "weight": 2 },
        { "id": "kraftwerk-trans", "kind": "created", "source": { "kind": "artist", "id": "kraftwerk" }, "target": { "kind": "album", "id": "trans-europe-express" }, "weight": 2 },
        { "id": "songs-sir-duke", "kind": "contains", "source": { "kind": "album", "id": "songs-in-the-key-of-life" }, "target": { "kind": "track", "id": "sir-duke" } },
        { "id": "rumours-dreams", "kind": "contains", "source": { "kind": "album", "id": "rumours" }, "target": { "kind": "track", "id": "dreams" } },
        { "id": "trans-europe", "kind": "contains", "source": { "kind": "album", "id": "trans-europe-express" }, "target": { "kind": "track", "id": "europe-endless" } },
        { "id": "songs-motown", "kind": "released-by", "source": { "kind": "album", "id": "songs-in-the-key-of-life" }, "target": { "kind": "label", "id": "motown" } },
        { "id": "rumours-warner", "kind": "released-by", "source": { "kind": "album", "id": "rumours" }, "target": { "kind": "label", "id": "warner-bros" } },
        { "id": "night-drive-trans", "kind": "contains", "source": { "kind": "playlist", "id": "night-drive" }, "target": { "kind": "album", "id": "trans-europe-express" } },
        { "id": "night-drive-dreams", "kind": "contains", "source": { "kind": "playlist", "id": "night-drive" }, "target": { "kind": "track", "id": "dreams" } }
    ]
}`;
