import type { TemporalMusicAtlasState } from "../../src/app/TemporalMusicAtlas";

export interface SemanticGeographyCounts {
    readonly continents: number;
    readonly districts: number;
    readonly buildings: number;
    readonly contents: number;
    readonly ruinedDistricts: number;
}

export function countSemanticGeography(state: TemporalMusicAtlasState): SemanticGeographyCounts {
    const counts = { continents: 0, districts: 0, buildings: 0 };
    for (const feature of state.hierarchy.getFeatures()) {
        counts[`${feature.role}s`] += 1;
    }
    return Object.freeze({
        ...counts,
        contents: state.hierarchy.getContents().length,
        ruinedDistricts: state.appearance
            .getAppearances()
            .filter(
                ({ featureId }) => state.hierarchy.getFeatureById(featureId)?.role === "district"
            ).length,
    });
}
