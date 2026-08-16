import { composeMusicCatalogs } from "../music";
import { MusicJsonImporter } from "../music/import";
import { GeographicLayoutGeneratorConfig, type WorldConfig } from "../world";

import { createDemoListeningHistory } from "./demoListeningHistory";
import { demoMusicDocumentJson } from "./demoMusicDocument";
import { createDemoSemanticMusicExtension } from "./demoSemanticMusicExtension";
import { TemporalMusicAtlas } from "./TemporalMusicAtlas";

/** Composes the imported JSON fixture with explicitly declared showcase-only semantic Music. */
export function createDemoTemporalMusicAtlas(worldConfig: WorldConfig): TemporalMusicAtlas {
    const imported = new MusicJsonImporter().parse(demoMusicDocumentJson);
    const seed = imported.metadata.seed;
    if (seed === undefined) {
        throw new Error("The navigable map document must provide metadata.seed.");
    }
    return new TemporalMusicAtlas({
        catalog: composeMusicCatalogs([imported.catalog, createDemoSemanticMusicExtension()]),
        listeningHistory: createDemoListeningHistory(),
        seed,
        worldConfig,
        rulesVersion: "temporal-music-presence-v1",
        activityRulesVersion: "music-activity-v1",
        geographicLayoutConfig: new GeographicLayoutGeneratorConfig({
            generationVersion: "geographic-layout-v1",
            seed,
            width: worldConfig.width,
            height: worldConfig.height,
        }),
    });
}
