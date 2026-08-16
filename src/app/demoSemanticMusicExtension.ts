import { MusicCatalog, MusicEntity, MusicRelation } from "../music";

/** Explicit showcase-only Genre declarations; no value is inferred from imported Music data. */
export function createDemoSemanticMusicExtension(): MusicCatalog {
    return new MusicCatalog(
        [
            genre("afrobeat", "Afrobeat"),
            genre("electronic", "Electronic"),
            genre("folk", "Folk"),
            genre("rock", "Rock"),
            genre("soul", "Soul"),
        ],
        [
            includes("afrobeat-fela-kuti", "afrobeat", "fela-kuti"),
            includes("electronic-brian-eno", "electronic", "brian-eno"),
            includes("electronic-david-bowie", "electronic", "david-bowie"),
            includes("electronic-kraftwerk", "electronic", "kraftwerk"),
            includes("folk-joni-mitchell", "folk", "joni-mitchell"),
            includes("rock-david-bowie", "rock", "david-bowie"),
            includes("rock-fleetwood-mac", "rock", "fleetwood-mac"),
            includes("soul-gil-scott-heron", "soul", "gil-scott-heron"),
            includes("soul-stevie-wonder", "soul", "stevie-wonder"),
        ]
    );
}

function genre(id: string, name: string): MusicEntity {
    return new MusicEntity({ kind: "genre", id, name });
}

function includes(id: string, genreId: string, artistId: string): MusicRelation {
    return new MusicRelation({
        id: `demo-genre:${id}`,
        kind: "includes",
        sourceKind: "genre",
        sourceId: genreId,
        targetKind: "artist",
        targetId: artistId,
    });
}
