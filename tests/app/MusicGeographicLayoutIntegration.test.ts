import { describe, expect, it } from "vitest";

import { MusicGeographicInterpreter } from "../../src/app";
import {
    MusicCatalog,
    MusicEntity,
    MusicInterpreter,
    MusicRelation,
    musicKnowledgeNodeId,
} from "../../src/music";
import {
    GeographicFocusResolver,
    GeographicLayoutGenerator,
    GeographicLayoutGeneratorConfig,
    resolveGeographicSpatialFocus,
} from "../../src/world";

describe("Music semantic geography to spatial focus integration", () => {
    it("resolves a Track through its Album Site without giving the Track a placement", () => {
        const catalog = new MusicCatalog(
            [
                new MusicEntity({ kind: "genre", id: "g", name: "Genre" }),
                new MusicEntity({ kind: "artist", id: "a", name: "Artist" }),
                new MusicEntity({ kind: "album", id: "x", title: "Album" }),
                new MusicEntity({ kind: "track", id: "y", title: "Track" }),
            ],
            [
                relation("genre-artist", "genre", "g", "artist", "a"),
                relation("artist-album", "artist", "a", "album", "x"),
                relation("album-track", "album", "x", "track", "y"),
            ]
        );
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
                width: 200,
                height: 100,
            })
        ).generate(hierarchy);

        const [continent] = hierarchy.getFeaturesByKnowledgeNodeId(
            musicKnowledgeNodeId("genre", "g")
        );
        const [district] = hierarchy.getFeaturesByKnowledgeNodeId(
            musicKnowledgeNodeId("artist", "a")
        );
        const [building] = hierarchy.getFeaturesByKnowledgeNodeId(
            musicKnowledgeNodeId("album", "x")
        );
        if (continent === undefined || district === undefined || building === undefined) {
            throw new Error("Expected the complete geographic hierarchy.");
        }
        expect(layout.getRegionPlacementByFeatureId(continent.id)).toBeDefined();
        const districtPlacement = layout.getRegionPlacementByFeatureId(district.id);
        const buildingPlacement = layout.getSitePlacementByFeatureId(building.id);
        expect(districtPlacement).toBeDefined();
        expect(buildingPlacement).toBeDefined();
        expect(layout.getPlacements()).toHaveLength(3);

        const [trackTarget] = new GeographicFocusResolver(hierarchy).resolveFocusTargets(
            musicKnowledgeNodeId("track", "y")
        );
        if (trackTarget === undefined || districtPlacement === undefined) {
            throw new Error("Expected the Track target and District placement.");
        }
        const focus = resolveGeographicSpatialFocus(trackTarget, layout);
        expect(focus.featureId).toBe(building.id);
        expect(focus.x).toBeGreaterThan(districtPlacement.bounds.x0);
        expect(focus.x).toBeLessThan(districtPlacement.bounds.x1);
        expect(focus.y).toBeGreaterThan(districtPlacement.bounds.y0);
        expect(focus.y).toBeLessThan(districtPlacement.bounds.y1);
    });
});

function relation(
    id: string,
    sourceKind: "genre" | "artist" | "album",
    sourceId: string,
    targetKind: "artist" | "album" | "track",
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
