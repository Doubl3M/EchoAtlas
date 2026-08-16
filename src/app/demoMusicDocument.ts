/** Local JSON V1 fixture used only by the browser showcase. */
export const demoMusicDocumentJson = JSON.stringify(
    {
        metadata: {
            version: "1.0",
            title: "EchoAtlas — A Seventies Voyage",
            owner: "EchoAtlas",
            seed: 1977,
            locale: "en",
        },
        artists: [
            { id: "stevie-wonder", name: "Stevie Wonder", country: "US", formed: 1961 },
            { id: "fleetwood-mac", name: "Fleetwood Mac", country: "UK", formed: 1967 },
            { id: "kraftwerk", name: "Kraftwerk", country: "DE", formed: 1970 },
            { id: "david-bowie", name: "David Bowie", country: "UK", formed: 1962 },
            { id: "joni-mitchell", name: "Joni Mitchell", country: "CA", formed: 1964 },
            { id: "fela-kuti", name: "Fela Kuti", country: "NG", formed: 1958 },
            { id: "brian-eno", name: "Brian Eno", country: "UK", formed: 1971 },
            { id: "gil-scott-heron", name: "Gil Scott-Heron", country: "US", formed: 1969 },
        ],
        albums: [
            { id: "songs-in-the-key-of-life", title: "Songs in the Key of Life", year: 1976 },
            { id: "rumours", title: "Rumours", year: 1977 },
            { id: "trans-europe-express", title: "Trans-Europe Express", year: 1977 },
            { id: "low", title: "Low", year: 1977 },
            { id: "hejira", title: "Hejira", year: 1976 },
            { id: "zombie", title: "Zombie", year: 1976 },
            { id: "another-green-world", title: "Another Green World", year: 1975 },
            { id: "pieces-of-a-man", title: "Pieces of a Man", year: 1971 },
            { id: "hissing-of-summer-lawns", title: "The Hissing of Summer Lawns", year: 1975 },
            { id: "man-machine", title: "The Man-Machine", year: 1978 },
        ],
        tracks: [
            { id: "sir-duke", title: "Sir Duke", trackNumber: 5 },
            { id: "as", title: "As", trackNumber: 16 },
            { id: "dreams", title: "Dreams", trackNumber: 2 },
            { id: "the-chain", title: "The Chain", trackNumber: 7 },
            { id: "europe-endless", title: "Europe Endless", trackNumber: 1 },
            { id: "showroom-dummies", title: "Showroom Dummies", trackNumber: 4 },
            { id: "sound-and-vision", title: "Sound and Vision", trackNumber: 4 },
            { id: "always-crashing", title: "Always Crashing in the Same Car", trackNumber: 7 },
            { id: "coyote", title: "Coyote", trackNumber: 1 },
            { id: "amelia", title: "Amelia", trackNumber: 2 },
            { id: "zombie-track", title: "Zombie", trackNumber: 1 },
            { id: "mr-follow-follow", title: "Mr. Follow Follow", trackNumber: 2 },
            { id: "st-elmos-fire", title: "St. Elmo's Fire", trackNumber: 3 },
            { id: "golden-hours", title: "Golden Hours", trackNumber: 5 },
            { id: "the-revolution", title: "The Revolution Will Not Be Televised", trackNumber: 1 },
            { id: "home-is-where-hatred-is", title: "Home Is Where the Hatred Is", trackNumber: 4 },
            { id: "in-france", title: "In France They Kiss on Main Street", trackNumber: 1 },
            { id: "edith-and-kingpin", title: "Edith and the Kingpin", trackNumber: 4 },
            { id: "robots", title: "The Robots", trackNumber: 1 },
            { id: "model", title: "The Model", trackNumber: 6 },
        ],
        labels: [
            { id: "motown", name: "Motown" },
            { id: "warner-bros", name: "Warner Bros." },
            { id: "rca", name: "RCA Records" },
            { id: "island", name: "Island Records" },
            { id: "flying-dutchman", name: "Flying Dutchman" },
            { id: "capitol", name: "Capitol Records" },
        ],
        playlists: [
            { id: "night-drive", name: "Night Drive" },
            { id: "golden-afternoon", name: "Golden Afternoon" },
            { id: "roads-less-travelled", name: "Roads Less Travelled" },
        ],
        relations: [
            relation(
                "stevie-songs",
                "performed",
                "artist",
                "stevie-wonder",
                "album",
                "songs-in-the-key-of-life",
                2
            ),
            relation(
                "fleetwood-rumours",
                "performed",
                "artist",
                "fleetwood-mac",
                "album",
                "rumours",
                2
            ),
            relation(
                "kraftwerk-trans",
                "performed",
                "artist",
                "kraftwerk",
                "album",
                "trans-europe-express",
                2
            ),
            relation(
                "kraftwerk-machine",
                "performed",
                "artist",
                "kraftwerk",
                "album",
                "man-machine",
                2
            ),
            relation("bowie-low", "performed", "artist", "david-bowie", "album", "low", 2),
            relation("joni-hejira", "performed", "artist", "joni-mitchell", "album", "hejira", 2),
            relation(
                "joni-hissing",
                "performed",
                "artist",
                "joni-mitchell",
                "album",
                "hissing-of-summer-lawns",
                2
            ),
            relation("fela-zombie", "performed", "artist", "fela-kuti", "album", "zombie", 2),
            relation(
                "eno-green-world",
                "performed",
                "artist",
                "brian-eno",
                "album",
                "another-green-world",
                2
            ),
            relation(
                "gil-pieces",
                "performed",
                "artist",
                "gil-scott-heron",
                "album",
                "pieces-of-a-man",
                2
            ),
            relation(
                "songs-sir-duke",
                "contains",
                "album",
                "songs-in-the-key-of-life",
                "track",
                "sir-duke"
            ),
            relation("songs-as", "contains", "album", "songs-in-the-key-of-life", "track", "as"),
            relation("rumours-dreams", "contains", "album", "rumours", "track", "dreams"),
            relation("rumours-chain", "contains", "album", "rumours", "track", "the-chain"),
            relation(
                "trans-europe",
                "contains",
                "album",
                "trans-europe-express",
                "track",
                "europe-endless"
            ),
            relation(
                "trans-showroom",
                "contains",
                "album",
                "trans-europe-express",
                "track",
                "showroom-dummies"
            ),
            relation("low-sound", "contains", "album", "low", "track", "sound-and-vision"),
            relation("low-crashing", "contains", "album", "low", "track", "always-crashing"),
            relation("hejira-coyote", "contains", "album", "hejira", "track", "coyote"),
            relation("hejira-amelia", "contains", "album", "hejira", "track", "amelia"),
            relation("zombie-title", "contains", "album", "zombie", "track", "zombie-track"),
            relation("zombie-follow", "contains", "album", "zombie", "track", "mr-follow-follow"),
            relation(
                "green-fire",
                "contains",
                "album",
                "another-green-world",
                "track",
                "st-elmos-fire"
            ),
            relation(
                "green-hours",
                "contains",
                "album",
                "another-green-world",
                "track",
                "golden-hours"
            ),
            relation(
                "pieces-revolution",
                "contains",
                "album",
                "pieces-of-a-man",
                "track",
                "the-revolution"
            ),
            relation(
                "pieces-home",
                "contains",
                "album",
                "pieces-of-a-man",
                "track",
                "home-is-where-hatred-is"
            ),
            relation(
                "hissing-france",
                "contains",
                "album",
                "hissing-of-summer-lawns",
                "track",
                "in-france"
            ),
            relation(
                "hissing-edith",
                "contains",
                "album",
                "hissing-of-summer-lawns",
                "track",
                "edith-and-kingpin"
            ),
            relation("machine-robots", "contains", "album", "man-machine", "track", "robots"),
            relation("machine-model", "contains", "album", "man-machine", "track", "model"),
            relation(
                "songs-motown",
                "released-by",
                "album",
                "songs-in-the-key-of-life",
                "label",
                "motown"
            ),
            relation("rumours-warner", "released-by", "album", "rumours", "label", "warner-bros"),
            relation(
                "trans-capitol",
                "released-by",
                "album",
                "trans-europe-express",
                "label",
                "capitol"
            ),
            relation("machine-capitol", "released-by", "album", "man-machine", "label", "capitol"),
            relation("low-rca", "released-by", "album", "low", "label", "rca"),
            relation("hejira-warner", "released-by", "album", "hejira", "label", "warner-bros"),
            relation(
                "hissing-warner",
                "released-by",
                "album",
                "hissing-of-summer-lawns",
                "label",
                "warner-bros"
            ),
            relation("zombie-island", "released-by", "album", "zombie", "label", "island"),
            relation(
                "green-island",
                "released-by",
                "album",
                "another-green-world",
                "label",
                "island"
            ),
            relation(
                "pieces-dutchman",
                "released-by",
                "album",
                "pieces-of-a-man",
                "label",
                "flying-dutchman"
            ),
            relation(
                "night-trans",
                "contains",
                "playlist",
                "night-drive",
                "album",
                "trans-europe-express"
            ),
            relation("night-low", "contains", "playlist", "night-drive", "album", "low"),
            relation("night-dreams", "contains", "playlist", "night-drive", "track", "dreams"),
            relation(
                "golden-songs",
                "contains",
                "playlist",
                "golden-afternoon",
                "album",
                "songs-in-the-key-of-life"
            ),
            relation(
                "golden-hejira",
                "contains",
                "playlist",
                "golden-afternoon",
                "album",
                "hejira"
            ),
            relation(
                "golden-hours-playlist",
                "contains",
                "playlist",
                "golden-afternoon",
                "track",
                "golden-hours"
            ),
            relation(
                "roads-zombie",
                "contains",
                "playlist",
                "roads-less-travelled",
                "album",
                "zombie"
            ),
            relation(
                "roads-pieces",
                "contains",
                "playlist",
                "roads-less-travelled",
                "album",
                "pieces-of-a-man"
            ),
            relation(
                "roads-chain",
                "contains",
                "playlist",
                "roads-less-travelled",
                "track",
                "the-chain"
            ),
            relation(
                "bowie-eno",
                "collaborated-with",
                "artist",
                "david-bowie",
                "artist",
                "brian-eno"
            ),
        ],
    },
    null,
    4
);

function relation(
    id: string,
    kind: string,
    sourceKind: string,
    sourceId: string,
    targetKind: string,
    targetId: string,
    weight?: number
): object {
    return {
        id,
        kind,
        source: { kind: sourceKind, id: sourceId },
        target: { kind: targetKind, id: targetId },
        ...(weight === undefined ? {} : { weight }),
    };
}
