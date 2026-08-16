import { describe, expect, it } from "vitest";

import { CurrentBroadcast, CurrentBroadcastEntry } from "../../src/app/CurrentBroadcast";
import {
    createDemoListeningHistory,
    demoHistoricalTimes,
} from "../../src/app/demoListeningHistory";
import { demoMusicDocumentJson } from "../../src/app/demoMusicDocument";
import { formatHistoricalDate } from "../../src/app/HistoricalTimelineControl";
import { TemporalMusicAtlas } from "../../src/app/TemporalMusicAtlas";
import { ListeningHistory } from "../../src/music";
import { MusicJsonImporter } from "../../src/music/import";
import { TerrainConfig } from "../../src/engine/terrain";
import { WorldConfig } from "../../src/world";

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

    it("keeps canonical Appearance empty when the JSON V1 showcase has no Genre hierarchy", () => {
        const snapshot = temporalAtlas().project(demoHistoricalTimes.crossings);

        expect(snapshot.activity?.getActivity("artist", "david-bowie")?.state).toBe("inactive");
        expect(snapshot.hierarchy.getFeatures()).toEqual([]);
        expect(snapshot.appearance.getAppearances()).toEqual([]);
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
    return createAtlas(imported.catalog, createDemoListeningHistory());
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
