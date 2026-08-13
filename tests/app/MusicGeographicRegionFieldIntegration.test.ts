import { describe, expect, it } from "vitest";

import { MusicGeographicInterpreter } from "../../src/app";
import {
    MusicCatalog,
    MusicEntity,
    MusicInterpreter,
    MusicRelation,
    musicKnowledgeNodeId,
    type MusicEntityKind,
} from "../../src/music";
import {
    GeographicFocusResolver,
    GeographicLayoutGenerator,
    GeographicLayoutGeneratorConfig,
    GeographicRegionFieldGenerator,
    GeographicRegionFieldGeneratorConfig,
    resolveGeographicSpatialFocus,
} from "../../src/world";

describe("Music semantic geography Region Field integration", () => {
    it("keeps Genres and Artists territorial while Albums and Tracks remain non-territorial", () => {
        const catalog = musicFixture();
        const graph = new MusicInterpreter().interpret(catalog);
        const hierarchy = new MusicGeographicInterpreter().interpret({
            catalog,
            knowledgeGraph: graph,
            version: "music-geography-v1",
        });
        const layout = new GeographicLayoutGenerator(
            new GeographicLayoutGeneratorConfig({
                generationVersion: "geographic-layout-v1",
                seed: "music-layout",
                width: 240,
                height: 120,
            })
        ).generate(hierarchy);
        const field = new GeographicRegionFieldGenerator(
            new GeographicRegionFieldGeneratorConfig({
                generationVersion: "geographic-region-field-v1",
                seed: "music-field",
                columns: 96,
                rows: 48,
            })
        ).generate(hierarchy, layout);

        const tripHop = onlyFeatureId(hierarchy, "genre", "trip-hop");
        const rock = onlyFeatureId(hierarchy, "genre", "rock");
        const tricky = onlyFeatureId(hierarchy, "artist", "tricky");
        const bowie = onlyFeatureId(hierarchy, "artist", "bowie");
        const maxinquaye = onlyFeatureId(hierarchy, "album", "maxinquaye");
        const low = onlyFeatureId(hierarchy, "album", "low");
        const owners = ownerIds(field);

        expect(layout.getRegionPlacementByFeatureId(tripHop)).toBeDefined();
        expect(layout.getRegionPlacementByFeatureId(rock)).toBeDefined();
        expect(new Set(owners.filter((owner) => owner !== undefined))).toEqual(
            new Set([tricky, bowie])
        );
        expect(owners).not.toContain(maxinquaye);
        expect(owners).not.toContain(low);

        const trackKnowledgeId = musicKnowledgeNodeId("track", "overcome");
        expect(hierarchy.getContentsByKnowledgeNodeId(trackKnowledgeId)).toHaveLength(1);
        const [target] = new GeographicFocusResolver(hierarchy).resolveFocusTargets(
            trackKnowledgeId
        );
        if (target === undefined) throw new Error("Expected Track content focus.");
        const focus = resolveGeographicSpatialFocus(target, layout);
        expect(focus.featureId).toBe(maxinquaye);
        expect(focus.x).toBe(layout.getSitePlacementByFeatureId(maxinquaye)?.position.x);
        expect(focus.y).toBe(layout.getSitePlacementByFeatureId(maxinquaye)?.position.y);
    });
});

function musicFixture(): MusicCatalog {
    return new MusicCatalog(
        [
            musicEntity("genre", "trip-hop"),
            musicEntity("artist", "tricky"),
            musicEntity("album", "maxinquaye"),
            musicEntity("track", "overcome"),
            musicEntity("genre", "rock"),
            musicEntity("artist", "bowie"),
            musicEntity("album", "low"),
        ],
        [
            relation("trip-hop-tricky", "genre", "trip-hop", "artist", "tricky"),
            relation("tricky-maxinquaye", "artist", "tricky", "album", "maxinquaye"),
            relation("maxinquaye-overcome", "album", "maxinquaye", "track", "overcome"),
            relation("rock-bowie", "genre", "rock", "artist", "bowie"),
            relation("bowie-low", "artist", "bowie", "album", "low"),
        ]
    );
}

function musicEntity(kind: MusicEntityKind, id: string): MusicEntity {
    if (kind === "album" || kind === "track") return new MusicEntity({ kind, id, title: id });
    return new MusicEntity({ kind, id, name: id });
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

function onlyFeatureId(
    hierarchy: ReturnType<MusicGeographicInterpreter["interpret"]>,
    kind: MusicEntityKind,
    id: string
): string {
    const [feature] = hierarchy.getFeaturesByKnowledgeNodeId(musicKnowledgeNodeId(kind, id));
    if (feature === undefined) throw new Error(`Missing geographic feature: ${kind}:${id}`);
    return feature.id;
}

function ownerIds(field: {
    getColumnCount(): number;
    getRowCount(): number;
    getOwnerFeatureId(column: number, row: number): string | undefined;
}): readonly (string | undefined)[] {
    const owners: Array<string | undefined> = [];
    for (let row = 0; row < field.getRowCount(); row += 1) {
        for (let column = 0; column < field.getColumnCount(); column += 1) {
            owners.push(field.getOwnerFeatureId(column, row));
        }
    }
    return owners;
}
