import { describe, expect, it } from "vitest";

import {
    CurrentBroadcast,
    CurrentBroadcastEntry,
    MusicGeographicInterpreter,
    createMusicAtlasSnapshot,
    planCurrentBroadcastLandmark,
} from "../../src/app";
import { demoMusicDocumentJson } from "../../src/app/demoMusicDocument";
import { TerrainConfig } from "../../src/engine/terrain";
import { WorldConfig } from "../../src/world";

describe("CurrentBroadcast", () => {
    it("supports an immutable empty broadcast", () => {
        const broadcast = new CurrentBroadcast();
        expect(broadcast.getEntries()).toEqual([]);
        expect(broadcast.getCurrentEntry()).toBeUndefined();
        expect(Object.isFrozen(broadcast)).toBe(true);
        expect(Object.isFrozen(broadcast.getEntries())).toBe(true);
    });

    it("preserves source order and defensively copies the playlist", () => {
        const first = entry("first", "First", "Artist A");
        const second = entry("second", "Second", "Artist B");
        const source = [second, first];
        const broadcast = new CurrentBroadcast({ entries: source, currentEntryId: second.id });
        source.reverse();
        expect(broadcast.getEntries().map(({ id }) => id)).toEqual(["second", "first"]);
        expect(broadcast.getCurrentEntry()).toBe(second);
        expect(Object.isFrozen(broadcast.getEntries())).toBe(true);
    });

    it("accepts a standalone track without any Music identity", () => {
        const standalone = entry("external", "Beyond the Atlas", "Demo Transmission");
        expect(standalone.musicKnowledgeNodeId).toBeUndefined();
        expect(Object.isFrozen(standalone)).toBe(true);
    });

    it("optionally preserves an existing Music identity without requiring it", () => {
        const linked = entry(
            "linked",
            "Sound and Vision",
            "David Bowie",
            "music:track:sound-and-vision"
        );
        expect(linked.musicKnowledgeNodeId).toBe("music:track:sound-and-vision");
    });

    it("rejects duplicate IDs, unknown current entries and invalid provenance", () => {
        const duplicate = entry("same", "Track", "Artist");
        expect(() => new CurrentBroadcast({ entries: [duplicate, duplicate] })).toThrow(
            "Duplicate current broadcast entry ID"
        );
        expect(
            () => new CurrentBroadcast({ entries: [duplicate], currentEntryId: "missing" })
        ).toThrow("Unknown current broadcast entry ID");
        expect(
            () =>
                new CurrentBroadcastEntry({
                    id: "entry",
                    trackTitle: "Track",
                    artistName: "Artist",
                    provenance: "sponsored" as "current-listening",
                })
        ).toThrow("Unsupported current broadcast provenance");
    });

    it("does not alter Knowledge, GeographicHierarchy or GeographicWorld", () => {
        const snapshot = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig());
        const hierarchy = new MusicGeographicInterpreter().interpret({
            catalog: snapshot.catalog,
            knowledgeGraph: snapshot.graph,
            version: "music-geography-v1",
        });
        const graphNodes = snapshot.graph.getNodes();
        const worldLocations = snapshot.world.getLocations();
        const worldConnections = snapshot.world.getConnections();
        const geographicFeatures = hierarchy.getFeatures();
        const geographicContents = hierarchy.getContents();

        const changedBroadcast = new CurrentBroadcast({
            entries: [entry("unknown", "Uncatalogued Signal", "Outside Artist")],
            currentEntryId: "unknown",
        });

        expect(changedBroadcast.getEntries()).toHaveLength(1);
        expect(snapshot.graph.getNodes()).toEqual(graphNodes);
        expect(snapshot.world.getLocations()).toEqual(worldLocations);
        expect(snapshot.world.getConnections()).toEqual(worldConnections);
        expect(hierarchy.getFeatures()).toEqual(geographicFeatures);
        expect(hierarchy.getContents()).toEqual(geographicContents);
        expect(snapshot.graph.getNode("unknown")).toBeUndefined();
        expect(snapshot.world.getLocationByKnowledgeNodeId("unknown")).toBeUndefined();
    });

    it("remains unchanged when the World is reconstructed with another seed", () => {
        const broadcast = new CurrentBroadcast({ entries: [entry("one", "One", "Artist")] });
        const changedSeed = demoMusicDocumentJson.replace('"seed": 1977', '"seed": 1980');
        const firstWorld = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig()).world;
        const secondWorld = createMusicAtlasSnapshot(changedSeed, worldConfig()).world;
        expect(secondWorld.getLocations()).not.toEqual(firstWorld.getLocations());
        expect(broadcast.getEntries()).toEqual([entry("one", "One", "Artist")]);
    });

    it("places its application landmark stably and away from the World center", () => {
        const first = planCurrentBroadcastLandmark(100, 80);
        expect(first.x).toBe(74);
        expect(first.y).toBeCloseTo(14.4);
        expect(planCurrentBroadcastLandmark(100, 80)).toEqual(first);
        expect(first).not.toEqual({ x: 50, y: 40 });
        expect(Object.isFrozen(first)).toBe(true);
    });
});

function entry(
    id: string,
    trackTitle: string,
    artistName: string,
    musicKnowledgeNodeId?: string
): CurrentBroadcastEntry {
    return new CurrentBroadcastEntry({
        id,
        trackTitle,
        artistName,
        provenance: "current-listening",
        musicKnowledgeNodeId,
    });
}

function worldConfig(): WorldConfig {
    return new WorldConfig({
        generationVersion: "world-v1-exact",
        width: 20,
        height: 12,
        placementIterations: 4,
        attractionStrength: 0.02,
        repulsionStrength: 0.3,
        terrain: new TerrainConfig({
            width: 20,
            height: 12,
            baseFrequency: 0.1,
            octaves: 2,
            persistence: 0.5,
            lacunarity: 2,
            offsetX: 0,
            offsetY: 0,
        }),
    });
}
