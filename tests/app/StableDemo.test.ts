import { describe, expect, it } from "vitest";

import { createDemoCurrentBroadcast } from "../../src/app/demoCurrentBroadcast";
import { demoHistoricalTimes } from "../../src/app/demoListeningHistory";
import { createDemoTemporalMusicAtlas } from "../../src/app/demoTemporalMusicAtlas";
import { createDemoWorldConfig } from "../../src/app/demoWorldConfig";
import { musicKnowledgeNodeId } from "../../src/music";
import { projectStableDemo } from "../../src/app/stable-demo/StableDemoModel";

describe("Stable EchoAtlas demo", () => {
    it("projects only canonical Continents, Districts and Buildings as map features", () => {
        const state = atlas().project(demoHistoricalTimes.latest);
        const bridge = projectStableDemo(state);

        expect(bridge.continents).toHaveLength(5);
        expect(bridge.districts).toHaveLength(9);
        expect(bridge.buildings).toHaveLength(11);
        expect(
            [...bridge.continents, ...bridge.districts, ...bridge.buildings].some(
                ({ feature }) =>
                    feature.sourceKnowledgeNodeId ===
                    musicKnowledgeNodeId("track", "sound-and-vision")
            )
        ).toBe(false);
    });

    it("uses real Building Contents for the Low panel", () => {
        const bridge = projectStableDemo(atlas().project(demoHistoricalTimes.latest));
        const lowBuildings = bridge.buildings.filter(
            ({ feature }) => feature.sourceKnowledgeNodeId === musicKnowledgeNodeId("album", "low")
        );

        expect(lowBuildings).toHaveLength(2);
        expect(lowBuildings.map(({ tracks }) => tracks.map(({ id }) => id))).toEqual([
            ["always-crashing", "sound-and-vision"],
            ["always-crashing", "sound-and-vision"],
        ]);
    });

    it("shows Bowie in two Districts and derives ruined state from Appearance", () => {
        const inactive = projectStableDemo(atlas().project(demoHistoricalTimes.crossings));
        const reactivated = projectStableDemo(atlas().project(demoHistoricalTimes.expansion));
        const bowieId = musicKnowledgeNodeId("artist", "david-bowie");
        const inactiveDistricts = inactive.districts.filter(
            ({ feature }) => feature.sourceKnowledgeNodeId === bowieId
        );
        const reactivatedDistricts = reactivated.districts.filter(
            ({ feature }) => feature.sourceKnowledgeNodeId === bowieId
        );

        expect(inactiveDistricts).toHaveLength(2);
        expect(inactiveDistricts.every(({ isRuined }) => isRuined)).toBe(true);
        expect(reactivatedDistricts.every(({ isRuined }) => !isRuined)).toBe(true);
        expect(reactivatedDistricts.map(({ feature }) => feature.id)).toEqual(
            inactiveDistricts.map(({ feature }) => feature.id)
        );
    });

    it("keeps CurrentBroadcast outside every temporal projection", () => {
        const temporalAtlas = atlas();
        const broadcast = createDemoCurrentBroadcast();
        const before = broadcast.getEntries();

        for (const milestone of temporalAtlas.getMilestones()) {
            projectStableDemo(temporalAtlas.project(milestone));
        }

        expect(broadcast.getEntries()).toEqual(before);
        expect(broadcast.getCurrentEntry()?.id).toBe("signal-01");
    });
});

function atlas(): ReturnType<typeof createDemoTemporalMusicAtlas> {
    return createDemoTemporalMusicAtlas(createDemoWorldConfig());
}
