import { describe, expect, it } from "vitest";

import { createMusicAtlasSnapshot, createMusicLabelProvider } from "../../src/app";
import { TerrainConfig } from "../../src/engine/terrain";
import { MusicCatalog, MusicEntity } from "../../src/music";
import { WorldConfig } from "../../src/world";
import { demoMusicDocumentJson } from "../../src/app/demoMusicDocument";

function worldConfig(): WorldConfig {
    return new WorldConfig({
        generationVersion: "world-v1-exact",
        width: 8,
        height: 6,
        placementIterations: 4,
        attractionStrength: 0.02,
        repulsionStrength: 0.3,
        terrain: new TerrainConfig({
            width: 8,
            height: 6,
            baseFrequency: 0.1,
            octaves: 2,
            persistence: 0.5,
            lacunarity: 2,
            offsetX: -2,
            offsetY: -3,
        }),
    });
}

describe("Music Atlas application pipeline", () => {
    it("runs JSON V1 through Music, Knowledge and World using metadata.seed", () => {
        const snapshot = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig());
        const changedSeedDocument = demoMusicDocumentJson.replace('"seed": 1977', '"seed": 1978');
        const changedSeed = createMusicAtlasSnapshot(changedSeedDocument, worldConfig());
        expect(snapshot.seed).toBe(1977);
        expect(snapshot.catalog.getEntities()).toHaveLength(47);
        expect(snapshot.graph.getNodes()).toHaveLength(47);
        expect(snapshot.world.getLocations()).toHaveLength(47);
        expect(snapshot.graph.getNode("music:artist:stevie-wonder")?.id).toBe(
            "music:artist:stevie-wonder"
        );
        expect(
            snapshot.world.getLocationByKnowledgeNodeId("music:artist:stevie-wonder")
                ?.knowledgeNodeId
        ).toBe("music:artist:stevie-wonder");
        expect(changedSeed.world.getLocations()).not.toEqual(snapshot.world.getLocations());
    });

    it("provides human labels without leaking Music data into Knowledge or World", () => {
        const snapshot = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig());
        expect(snapshot.labels("music:artist:stevie-wonder")).toEqual({
            text: "Stevie Wonder",
            priority: 100,
            minZoom: 0,
            landmarkKind: "city",
        });
        expect(snapshot.labels("music:album:rumours")?.text).toBe("Rumours");
        expect(snapshot.labels("music:album:rumours")?.landmarkKind).toBeUndefined();
        expect(snapshot.labels("music:track:dreams")?.text).toBe("Dreams");
        expect(snapshot.labels("music:label:motown")?.text).toBe("Motown");
        expect(snapshot.labels("music:playlist:night-drive")?.text).toBe("Night Drive");
        expect(Object.keys(snapshot.graph.getNode("music:artist:stevie-wonder") ?? {})).toEqual([
            "id",
            "kind",
            "weight",
        ]);
        expect(
            Object.keys(
                snapshot.world.getLocationByKnowledgeNodeId("music:artist:stevie-wonder") ?? {}
            )
        ).toEqual(["knowledgeNodeId", "x", "y", "elevation"]);
    });

    it("is deterministic in world ordering, values and labels", () => {
        const first = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig());
        const second = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig());
        expect(second.graph.getNodes()).toEqual(first.graph.getNodes());
        expect(second.world.getLocations()).toEqual(first.world.getLocations());
        expect(second.world.heightField.toArray()).toEqual(first.world.heightField.toArray());
        expect(
            second.world.getLocations().map(({ knowledgeNodeId }) => second.labels(knowledgeNodeId))
        ).toEqual(
            first.world.getLocations().map(({ knowledgeNodeId }) => first.labels(knowledgeNodeId))
        );
    });

    it("is independent from JSON collection insertion order", () => {
        const reordered = JSON.parse(demoMusicDocumentJson) as {
            artists: unknown[];
            albums: unknown[];
            tracks: unknown[];
            labels: unknown[];
            playlists: unknown[];
            relations: unknown[];
        };
        reordered.artists.reverse();
        reordered.albums.reverse();
        reordered.tracks.reverse();
        reordered.labels.reverse();
        reordered.playlists.reverse();
        reordered.relations.reverse();

        const first = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig());
        const second = createMusicAtlasSnapshot(JSON.stringify(reordered), worldConfig());
        expect(second.graph.getNodes()).toEqual(first.graph.getNodes());
        expect(second.graph.getRelations()).toEqual(first.graph.getRelations());
        expect(second.world.getLocations()).toEqual(first.world.getLocations());
        expect(second.world.getConnections()).toEqual(first.world.getConnections());
        expect(
            second.world.getLocations().map(({ knowledgeNodeId }) => second.labels(knowledgeNodeId))
        ).toEqual(
            first.world.getLocations().map(({ knowledgeNodeId }) => first.labels(knowledgeNodeId))
        );
    });

    it("requires the document seed instead of choosing an ambiguous fallback", () => {
        const document = JSON.parse(demoMusicDocumentJson) as { metadata: { seed?: number } };
        delete document.metadata.seed;
        expect(() => createMusicAtlasSnapshot(JSON.stringify(document), worldConfig())).toThrow(
            "must provide metadata.seed"
        );
    });

    it("changes a name only in rendered labels, never in Knowledge or World identity", () => {
        const changedDocument = JSON.parse(demoMusicDocumentJson) as {
            artists: { name: string }[];
        };
        const changedArtist = changedDocument.artists[0];
        if (changedArtist === undefined) {
            throw new Error("Demo fixture must contain an artist.");
        }
        changedArtist.name = "Stevie Wonder Renamed";

        const first = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig());
        const changed = createMusicAtlasSnapshot(JSON.stringify(changedDocument), worldConfig());
        expect(first.labels("music:artist:stevie-wonder")?.text).toBe("Stevie Wonder");
        expect(changed.labels("music:artist:stevie-wonder")?.text).toBe("Stevie Wonder Renamed");
        expect(changed.graph.getNodes()).toEqual(first.graph.getNodes());
        expect(changed.world.getLocations()).toEqual(first.world.getLocations());
    });

    it("does not invent labels for Music kinds outside JSON V1", () => {
        const provider = createMusicLabelProvider(
            new MusicCatalog([new MusicEntity({ kind: "genre", id: "ambient", name: "Ambient" })])
        );
        expect(provider("music:genre:ambient")).toBeUndefined();
    });
});
