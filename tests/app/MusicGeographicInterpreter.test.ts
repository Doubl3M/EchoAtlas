import { describe, expect, it } from "vitest";

import {
    MusicGeographicInterpreter,
    type MusicGeographyInterpretationVersion,
} from "../../src/app";
import {
    MusicCatalog,
    MusicEntity,
    MusicInterpreter,
    MusicRelation,
    musicKnowledgeNodeId,
    type MusicEntityKind,
} from "../../src/music";

describe("MusicGeographicInterpreter", () => {
    it("creates an empty hierarchy from an empty catalog and graph", () => {
        const catalog = new MusicCatalog();
        const hierarchy = interpret(catalog);
        expect(hierarchy.getFeatures()).toEqual([]);
        expect(hierarchy.getContents()).toEqual([]);
    });

    it("keeps an empty Genre as a root Continent", () => {
        const hierarchy = interpret(catalogOf([{ kind: "genre", id: "jazz" }]));
        const [continent] = hierarchy.getFeatures();
        expect(continent).toMatchObject({
            role: "continent",
            parentId: undefined,
            sourceKnowledgeNodeId: "music:genre:jazz",
        });
        expect(hierarchy.getChildren(continent?.id ?? "missing")).toEqual([]);
    });

    it("derives the complete directed Continent, District, Building and Content chain", () => {
        const hierarchy = interpret(completeCatalog());
        const continent = onlyFeature(hierarchy, "genre", "trip-hop");
        const district = onlyFeature(hierarchy, "artist", "tricky");
        const building = onlyFeature(hierarchy, "album", "maxinquaye");
        const [content] = hierarchy.getContents();
        expect(district.parentId).toBe(continent.id);
        expect(building.parentId).toBe(district.id);
        expect(content).toMatchObject({
            knowledgeNodeId: "music:track:overcome",
            containerFeatureId: building.id,
        });
    });

    it("does not invent geography for orphan Artists, Albums or Tracks", () => {
        const hierarchy = interpret(
            catalogOf([
                { kind: "artist", id: "orphan-artist" },
                { kind: "album", id: "orphan-album" },
                { kind: "track", id: "orphan-track" },
            ])
        );
        expect(hierarchy.getFeatures()).toEqual([]);
        expect(hierarchy.getContents()).toEqual([]);
    });

    it("does not propagate Albums or Tracks through an unrepresented parent", () => {
        const catalog = new MusicCatalog(
            [entity("artist", "artist"), entity("album", "album"), entity("track", "track")],
            [
                relation("artist-album", "artist", "artist", "album", "album"),
                relation("album-track", "album", "album", "track", "track"),
            ]
        );
        const hierarchy = interpret(catalog);
        expect(hierarchy.getFeatures()).toEqual([]);
        expect(hierarchy.getContents()).toEqual([]);
    });

    it("ignores inverse and unrelated directed relations", () => {
        const hierarchy = interpret(
            new MusicCatalog(standardEntities(), [
                relation("artist-genre", "artist", "tricky", "genre", "trip-hop"),
                relation("album-artist", "album", "maxinquaye", "artist", "tricky"),
                relation("track-album", "track", "overcome", "album", "maxinquaye"),
                relation("playlist-track", "playlist", "mix", "track", "overcome"),
                relation("label-artist", "label", "island", "artist", "tricky"),
            ])
        );
        expect(hierarchy.getFeatures().map(({ role }) => role)).toEqual(["continent"]);
        expect(hierarchy.getContents()).toEqual([]);
    });

    it("deduplicates repeated logical containment relations", () => {
        const hierarchy = interpret(
            new MusicCatalog(standardEntities(), [
                relation("ga-1", "genre", "trip-hop", "artist", "tricky"),
                relation("ga-2", "genre", "trip-hop", "artist", "tricky"),
                relation("aa-1", "artist", "tricky", "album", "maxinquaye"),
                relation("aa-2", "artist", "tricky", "album", "maxinquaye"),
                relation("at-1", "album", "maxinquaye", "track", "overcome"),
                relation("at-2", "album", "maxinquaye", "track", "overcome"),
            ])
        );
        expect(hierarchy.getFeatures()).toHaveLength(3);
        expect(hierarchy.getContents()).toHaveLength(1);
    });

    it("propagates a multi-genre Artist through its Albums and Tracks", () => {
        const catalog = new MusicCatalog(
            [
                entity("genre", "trip-hop"),
                entity("genre", "electronic"),
                entity("artist", "tricky"),
                entity("album", "maxinquaye"),
                entity("track", "overcome"),
            ],
            [
                relation("g1-a", "genre", "trip-hop", "artist", "tricky"),
                relation("g2-a", "genre", "electronic", "artist", "tricky"),
                relation("a-album", "artist", "tricky", "album", "maxinquaye"),
                relation("album-track", "album", "maxinquaye", "track", "overcome"),
            ]
        );
        const hierarchy = interpret(catalog);
        const districts = hierarchy.getFeaturesByKnowledgeNodeId("music:artist:tricky");
        expect(districts).toHaveLength(2);
        expect(
            districts.every(
                ({ sourceKnowledgeNodeId }) => sourceKnowledgeNodeId === "music:artist:tricky"
            )
        ).toBe(true);
        expect(hierarchy.getFeaturesByKnowledgeNodeId("music:album:maxinquaye")).toHaveLength(2);
        expect(hierarchy.getContents()).toHaveLength(2);
    });

    it("creates an Album Building below every represented Artist parent", () => {
        const catalog = new MusicCatalog(
            [
                entity("genre", "g"),
                entity("artist", "a"),
                entity("artist", "b"),
                entity("album", "shared"),
            ],
            [
                relation("g-a", "genre", "g", "artist", "a"),
                relation("g-b", "genre", "g", "artist", "b"),
                relation("a-x", "artist", "a", "album", "shared"),
                relation("b-x", "artist", "b", "album", "shared"),
            ]
        );
        expect(interpret(catalog).getFeaturesByKnowledgeNodeId("music:album:shared")).toHaveLength(
            2
        );
    });

    it("gives no V1 geography to Label, Playlist or Compilation", () => {
        const hierarchy = interpret(
            catalogOf([
                { kind: "label", id: "island" },
                { kind: "playlist", id: "mix" },
                { kind: "compilation", id: "collection" },
            ])
        );
        expect(hierarchy.getFeatures()).toEqual([]);
        expect(hierarchy.getContents()).toEqual([]);
    });

    it("is independent from entity and relation input order", () => {
        const first = completeCatalog();
        const second = new MusicCatalog(
            [...first.getEntities()].reverse(),
            [...first.getRelations()].reverse()
        );
        expect(signature(interpret(second))).toEqual(signature(interpret(first)));
    });

    it("uses deterministic injective identities for separator-bearing IDs", () => {
        const catalog = new MusicCatalog(
            [
                entity("genre", "a:b"),
                entity("genre", "a"),
                entity("artist", "c"),
                entity("artist", "b:c"),
            ],
            [
                relation("one", "genre", "a:b", "artist", "c"),
                relation("two", "genre", "a", "artist", "b:c"),
            ]
        );
        const first = interpret(catalog);
        const ids = first.getFeatures().map(({ id }) => id);
        expect(new Set(ids).size).toBe(4);
        expect(signature(interpret(catalog))).toEqual(signature(first));
    });

    it("rejects an unknown interpretation version without fallback", () => {
        const catalog = new MusicCatalog();
        expect(() =>
            new MusicGeographicInterpreter().interpret({
                catalog,
                knowledgeGraph: new MusicInterpreter().interpret(catalog),
                version: "music-geography-v2" as MusicGeographyInterpretationVersion,
            })
        ).toThrowError("Unsupported Music geography interpretation version: music-geography-v2");
    });

    it("only interprets catalog entities retaining their canonical Knowledge identity", () => {
        const catalog = catalogOf([{ kind: "genre", id: "jazz" }]);
        const hierarchy = new MusicGeographicInterpreter().interpret({
            catalog,
            knowledgeGraph: new MusicInterpreter().interpret(new MusicCatalog()),
            version: "music-geography-v1",
        });
        expect(hierarchy.getFeatures()).toEqual([]);
    });
});

type EntitySpec = Readonly<{ kind: MusicEntityKind; id: string }>;

function entity(kind: MusicEntityKind, id: string): MusicEntity {
    if (kind === "album") return new MusicEntity({ kind, id, title: id });
    if (kind === "track") return new MusicEntity({ kind, id, title: id });
    return new MusicEntity({ kind, id, name: id });
}

function catalogOf(specs: readonly EntitySpec[]): MusicCatalog {
    return new MusicCatalog(specs.map(({ kind, id }) => entity(kind, id)));
}

function relation(
    id: string,
    sourceKind: MusicEntityKind,
    sourceId: string,
    targetKind: MusicEntityKind,
    targetId: string
): MusicRelation {
    return new MusicRelation({
        id,
        sourceKind,
        sourceId,
        targetKind,
        targetId,
        kind: "fixture-link",
    });
}

function standardEntities(): readonly MusicEntity[] {
    return [
        entity("genre", "trip-hop"),
        entity("artist", "tricky"),
        entity("album", "maxinquaye"),
        entity("track", "overcome"),
        entity("label", "island"),
        entity("playlist", "mix"),
    ];
}

function completeCatalog(): MusicCatalog {
    return new MusicCatalog(standardEntities(), [
        relation("genre-artist", "genre", "trip-hop", "artist", "tricky"),
        relation("artist-album", "artist", "tricky", "album", "maxinquaye"),
        relation("album-track", "album", "maxinquaye", "track", "overcome"),
    ]);
}

function interpret(catalog: MusicCatalog) {
    return new MusicGeographicInterpreter().interpret({
        catalog,
        knowledgeGraph: new MusicInterpreter().interpret(catalog),
        version: "music-geography-v1",
    });
}

function onlyFeature(hierarchy: ReturnType<typeof interpret>, kind: MusicEntityKind, id: string) {
    const features = hierarchy.getFeaturesByKnowledgeNodeId(musicKnowledgeNodeId(kind, id));
    expect(features).toHaveLength(1);
    const feature = features[0];
    if (feature === undefined) throw new Error("Expected one geographic feature.");
    return feature;
}

function signature(hierarchy: ReturnType<typeof interpret>): object {
    return {
        features: hierarchy.getFeatures().map(({ id, role, parentId, sourceKnowledgeNodeId }) => ({
            id,
            role,
            parentId,
            sourceKnowledgeNodeId,
        })),
        contents: hierarchy.getContents().map(({ id, knowledgeNodeId, containerFeatureId }) => ({
            id,
            knowledgeNodeId,
            containerFeatureId,
        })),
    };
}
