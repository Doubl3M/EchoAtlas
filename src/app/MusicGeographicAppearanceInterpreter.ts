import { musicKnowledgeNodeId, type MusicActivitySnapshot } from "../music";
import {
    GeographicAppearanceSnapshot,
    GeographicFeatureAppearance,
    type GeographicHierarchy,
} from "../world";
import {
    type MusicGeographicAppearanceVersion,
    validateMusicGeographicAppearanceVersion,
} from "./MusicGeographicAppearanceVersion";

export interface MusicGeographicAppearanceInterpretationOptions {
    readonly activity: MusicActivitySnapshot;
    readonly hierarchy: GeographicHierarchy;
    readonly version: MusicGeographicAppearanceVersion;
}

/** Applies versioned Music-product policy to generic geographic appearance. */
export class MusicGeographicAppearanceInterpreter {
    public interpret(
        options: MusicGeographicAppearanceInterpretationOptions
    ): GeographicAppearanceSnapshot {
        validateMusicGeographicAppearanceVersion(options.version);
        const appearances = new Map<string, GeographicFeatureAppearance>();

        for (const activity of options.activity.getActivities()) {
            if (activity.musicEntityKind !== "artist" || activity.state !== "inactive") {
                continue;
            }
            const knowledgeNodeId = musicKnowledgeNodeId("artist", activity.musicEntityId);
            for (const feature of options.hierarchy.getFeaturesByKnowledgeNodeId(knowledgeNodeId)) {
                if (feature.role === "district") {
                    appearances.set(
                        feature.id,
                        new GeographicFeatureAppearance({
                            featureId: feature.id,
                            condition: "ruined",
                        })
                    );
                }
            }
        }

        return new GeographicAppearanceSnapshot({
            hierarchy: options.hierarchy,
            appearances: [...appearances.values()],
        });
    }
}
