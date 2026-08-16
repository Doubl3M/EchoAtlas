import { describe, expect, it } from "vitest";

import { CurrentBroadcast, CurrentBroadcastEntry } from "../../src/app/CurrentBroadcast";
import {
    createDemoListeningHistory,
    demoHistoricalTimes,
} from "../../src/app/demoListeningHistory";
import { demoMusicDocumentJson } from "../../src/app/demoMusicDocument";
import { createDemoSemanticMusicExtension } from "../../src/app/demoSemanticMusicExtension";
import { formatHistoricalDate } from "../../src/app/HistoricalTimelineControl";
import { TemporalMusicAtlas, type TemporalMusicAtlasState } from "../../src/app/TemporalMusicAtlas";
import { composeMusicCatalogs, ListeningHistory, musicKnowledgeNodeId } from "../../src/music";
import { MusicJsonImporter } from "../../src/music/import";
import { TerrainConfig } from "../../src/engine/terrain";
import {
    GeographicFocusResolver,
    GeographicLayoutGeneratorConfig,
    resolveGeographicSpatialFocus,
    WorldConfig,
} from "../../src/world";

describe("TemporalMusicAtlas", () => {
    it("starts at the latest deduplicated historical milestone", () => {
        const atlas = temporalAtlas();

        expect(atlas.getMilestones()).toEqual([
            demoHistoricalTimes.beginnings,
            demoHistoricalTimes.crossings,
            demoHistoricalTimes.expansion,
            demoHistoricalTimes.latest,
        ]);
        expect(atlas.getInitialHistoricalTime()).toBe(demoHistoricalTimes.latest);
    });

    it("produces four increasingly rich canonical showcase periods", () => {
        const atlas = temporalAtlas();
        const counts = atlas.getMilestones().map((at) => {
            const snapshot = atlas.project(at);
            return [snapshot.catalog.getEntities().length, snapshot.catalog.getRelations().length];
        });

        expect(counts).toEqual([
            [8, 7],
            [20, 16],
            [32, 25],
            [47, 50],
        ]);
    });

    it("exposes deterministic semantic geography counts for all showcase milestones", () => {
        const atlas = temporalAtlas();

        expect(
            atlas.getMilestones().map((at) => countSemanticGeography(atlas.project(at)))
        ).toEqual([
            { continents: 2, districts: 3, buildings: 3, contents: 6, ruinedDistricts: 0 },
            { continents: 4, districts: 6, buildings: 6, contents: 12, ruinedDistricts: 3 },
            { continents: 5, districts: 9, buildings: 9, contents: 18, ruinedDistricts: 3 },
            { continents: 5, districts: 9, buildings: 11, contents: 22, ruinedDistricts: 7 },
        ]);
    });

    it("reconstructs the exact latest World after visiting earlier periods", () => {
        const atlas = temporalAtlas();
        const firstLatest = atlas.project(demoHistoricalTimes.latest);

        atlas.project(demoHistoricalTimes.beginnings);
        atlas.project(demoHistoricalTimes.crossings);
        const returnedLatest = atlas.project(demoHistoricalTimes.latest);

        expect(worldSignature(returnedLatest)).toEqual(worldSignature(firstLatest));
    });

    it("reconstructs Presence and Activity independently at every historical instant", () => {
        const atlas = temporalAtlas();
        const artistId = "music:artist:david-bowie";

        const active = atlas.project(demoHistoricalTimes.beginnings);
        const inactive = atlas.project(demoHistoricalTimes.crossings);
        const reactivated = atlas.project(demoHistoricalTimes.expansion);
        const returnedActive = atlas.project(demoHistoricalTimes.beginnings);

        expect(active.selectedHistoricalTime).toBe(demoHistoricalTimes.beginnings);
        expect(
            active.presence
                ?.getCatalog()
                .getEntities()
                .some(({ kind, id }) => kind === "artist" && id === "david-bowie")
        ).toBe(true);
        expect(active.activity?.getActivity("artist", "david-bowie")?.state).toBe("active");
        expect(active.labels(artistId)?.presentationTone).toBeUndefined();
        expect(
            inactive.presence
                ?.getCatalog()
                .getEntities()
                .some(({ kind, id }) => kind === "artist" && id === "david-bowie")
        ).toBe(true);
        expect(inactive.activity?.getActivity("artist", "david-bowie")?.state).toBe("inactive");
        expect(inactive.labels(artistId)?.presentationTone).toBe("weathered");
        expect(reactivated.activity?.getActivity("artist", "david-bowie")?.state).toBe("active");
        expect(reactivated.labels(artistId)?.presentationTone).toBeUndefined();
        expect(returnedActive.activity?.getActivities()).toEqual(active.activity?.getActivities());
        expect(returnedActive.labels(artistId)).toEqual(active.labels(artistId));
    });

    it("produces stable multi-Genre Bowie geography and temporal District appearance", () => {
        const atlas = temporalAtlas();
        const active = atlas.project(demoHistoricalTimes.beginnings);
        const inactive = atlas.project(demoHistoricalTimes.crossings);
        const reactivated = atlas.project(demoHistoricalTimes.expansion);
        const bowieNodeId = musicKnowledgeNodeId("artist", "david-bowie");
        const lowNodeId = musicKnowledgeNodeId("album", "low");
        const trackNodeId = musicKnowledgeNodeId("track", "sound-and-vision");
        const districts = inactive.hierarchy
            .getFeaturesByKnowledgeNodeId(bowieNodeId)
            .filter(({ role }) => role === "district");
        const buildings = inactive.hierarchy
            .getFeaturesByKnowledgeNodeId(lowNodeId)
            .filter(({ role }) => role === "building");
        const contents = inactive.hierarchy.getContentsByKnowledgeNodeId(trackNodeId);

        expect(districts).toHaveLength(2);
        expect(new Set(districts.map(({ parentId }) => parentId)).size).toBe(2);
        expect(buildings).toHaveLength(2);
        expect(new Set(buildings.map(({ parentId }) => parentId))).toEqual(
            new Set(districts.map(({ id }) => id))
        );
        expect(contents).toHaveLength(2);
        expect(new Set(contents.map(({ containerFeatureId }) => containerFeatureId))).toEqual(
            new Set(buildings.map(({ id }) => id))
        );
        expect(active.appearance.getAppearances()).toEqual([]);
        expect(districts.map(({ id }) => inactive.appearance.getAppearance(id)?.condition)).toEqual(
            ["ruined", "ruined"]
        );
        expect(districts.map(({ id }) => reactivated.appearance.getAppearance(id))).toEqual([
            undefined,
            undefined,
        ]);
        expect(
            reactivated.hierarchy
                .getFeaturesByKnowledgeNodeId(bowieNodeId)
                .filter(({ role }) => role === "district")
                .map(({ id }) => id)
        ).toEqual(districts.map(({ id }) => id));
        expect(reactivated.layout.getPlacements()).toEqual(
            atlas.project(demoHistoricalTimes.expansion).layout.getPlacements()
        );
    });

    it("resolves real Genre, Artist, Album and Track focus from the temporal showcase", () => {
        const snapshot = temporalAtlas().project(demoHistoricalTimes.expansion);
        const resolver = new GeographicFocusResolver(snapshot.hierarchy);
        const targets = {
            rock: resolver.resolveFocusTargets(musicKnowledgeNodeId("genre", "rock")),
            bowie: resolver.resolveFocusTargets(musicKnowledgeNodeId("artist", "david-bowie")),
            low: resolver.resolveFocusTargets(musicKnowledgeNodeId("album", "low")),
            track: resolver.resolveFocusTargets(musicKnowledgeNodeId("track", "sound-and-vision")),
        };

        expect(targets.rock).toHaveLength(1);
        expect(targets.bowie).toHaveLength(2);
        expect(targets.low).toHaveLength(2);
        expect(targets.track).toHaveLength(2);
        expect(
            targets.track.every(
                ({ representationKind }) => representationKind === "content-container"
            )
        ).toBe(true);
        expect(
            targets.track.map((target) => {
                const focus = resolveGeographicSpatialFocus(target, snapshot.layout);
                return [focus.featureId, focus.x, focus.y];
            })
        ).toEqual(
            targets.low.map((target) => {
                const focus = resolveGeographicSpatialFocus(target, snapshot.layout);
                return [focus.featureId, focus.x, focus.y];
            })
        );
    });

    it("never mutates the full source catalog", () => {
        const imported = new MusicJsonImporter().parse(demoMusicDocumentJson);
        const atlas = createAtlas(imported.catalog, createDemoListeningHistory());
        const before = imported.catalog.getEntities();

        atlas.project(demoHistoricalTimes.beginnings);
        atlas.project(demoHistoricalTimes.latest);

        expect(imported.catalog.getEntities()).toEqual(before);
        expect(imported.catalog.getEntities()).toHaveLength(47);
    });

    it("does not accept CurrentBroadcast as temporal input or change its entries", () => {
        const broadcast = new CurrentBroadcast({
            entries: [
                new CurrentBroadcastEntry({
                    id: "broadcast-entry",
                    trackTitle: "Future Signal",
                    artistName: "Outside Atlas",
                    provenance: "current-listening",
                    musicKnowledgeNodeId: "music:track:future-signal",
                }),
            ],
        });
        const before = broadcast.getEntries();
        const atlas = temporalAtlas();

        for (const at of atlas.getMilestones()) atlas.project(at);

        expect(broadcast.getEntries()).toEqual(before);
    });

    it("handles an empty history without inventing a timestamp", () => {
        const imported = new MusicJsonImporter().parse(demoMusicDocumentJson);
        const atlas = createAtlas(imported.catalog, new ListeningHistory());
        const empty = atlas.projectEmpty();

        expect(atlas.getMilestones()).toEqual([]);
        expect(atlas.getInitialHistoricalTime()).toBeUndefined();
        expect(empty.catalog.getEntities()).toEqual([]);
        expect(empty.graph.getNodes()).toEqual([]);
        expect(empty.world.getLocations()).toEqual([]);
    });

    it("formats historical milestones with a deterministic UTC day", () => {
        expect(formatHistoricalDate(demoHistoricalTimes.beginnings)).toBe("15 janv. 1974");
        expect(formatHistoricalDate(demoHistoricalTimes.latest)).toBe("03 mars 1979");
    });
});

function temporalAtlas(): TemporalMusicAtlas {
    const imported = new MusicJsonImporter().parse(demoMusicDocumentJson);
    return createAtlas(
        composeMusicCatalogs([imported.catalog, createDemoSemanticMusicExtension()]),
        createDemoListeningHistory()
    );
}

function countSemanticGeography(state: TemporalMusicAtlasState): {
    readonly continents: number;
    readonly districts: number;
    readonly buildings: number;
    readonly contents: number;
    readonly ruinedDistricts: number;
} {
    return {
        continents: state.hierarchy.getFeatures().filter(({ role }) => role === "continent").length,
        districts: state.hierarchy.getFeatures().filter(({ role }) => role === "district").length,
        buildings: state.hierarchy.getFeatures().filter(({ role }) => role === "building").length,
        contents: state.hierarchy.getContents().length,
        ruinedDistricts: state.appearance
            .getAppearances()
            .filter(
                ({ featureId }) => state.hierarchy.getFeatureById(featureId)?.role === "district"
            ).length,
    };
}

function createAtlas(
    catalog: ReturnType<MusicJsonImporter["parse"]>["catalog"],
    listeningHistory: ListeningHistory
): TemporalMusicAtlas {
    return new TemporalMusicAtlas({
        catalog,
        listeningHistory,
        seed: 1977,
        worldConfig: worldConfig(),
        rulesVersion: "temporal-music-presence-v1",
        activityRulesVersion: "music-activity-v1",
        geographicLayoutConfig: new GeographicLayoutGeneratorConfig({
            generationVersion: "geographic-layout-v1",
            seed: 1977,
            width: 96,
            height: 64,
        }),
    });
}

function worldConfig(): WorldConfig {
    return new WorldConfig({
        generationVersion: "world-v1-exact",
        width: 96,
        height: 64,
        placementIterations: 32,
        attractionStrength: 0.018,
        repulsionStrength: 0.42,
        terrain: new TerrainConfig({
            width: 192,
            height: 128,
            baseFrequency: 0.022,
            octaves: 5,
            persistence: 0.58,
            lacunarity: 2,
            offsetX: -18,
            offsetY: -11,
        }),
    });
}

function worldSignature(snapshot: ReturnType<TemporalMusicAtlas["project"]>): object {
    return {
        entities: snapshot.catalog.getEntities().map(({ kind, id }) => `${kind}:${id}`),
        relations: snapshot.catalog.getRelations().map(({ id }) => id),
        locations: snapshot.world
            .getLocations()
            .map(({ knowledgeNodeId, x, y, elevation }) => [knowledgeNodeId, x, y, elevation]),
        connections: snapshot.world
            .getConnections()
            .map(({ knowledgeRelationId, sourceKnowledgeNodeId, targetKnowledgeNodeId }) => [
                knowledgeRelationId,
                sourceKnowledgeNodeId,
                targetKnowledgeNodeId,
            ]),
    };
}
