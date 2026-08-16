import { musicKnowledgeNodeId, type MusicCatalog, type MusicEntity } from "../../music";
import type { GeographicBounds, GeographicFeature, GeographicPoint } from "../../world";

import type { TemporalMusicAtlasState } from "../TemporalMusicAtlas";

export interface StableDemoContinent {
    readonly feature: GeographicFeature;
    readonly name: string;
    readonly bounds: GeographicBounds;
}

export interface StableDemoDistrict {
    readonly feature: GeographicFeature;
    readonly name: string;
    readonly bounds: GeographicBounds;
    readonly isRuined: boolean;
}

export interface StableDemoBuilding {
    readonly feature: GeographicFeature;
    readonly title: string;
    readonly position: GeographicPoint;
    readonly tracks: readonly MusicEntity[];
}

export interface StableDemoSnapshot {
    readonly catalog: MusicCatalog;
    readonly continents: readonly StableDemoContinent[];
    readonly districts: readonly StableDemoDistrict[];
    readonly buildings: readonly StableDemoBuilding[];
}

/** Presentation-only projection; canonical identity, containment and positions remain untouched. */
export function projectStableDemo(state: TemporalMusicAtlasState): StableDemoSnapshot {
    const catalog = state.presence?.getCatalog() ?? state.catalog;
    const entities = indexEntities(catalog);
    const continents: StableDemoContinent[] = [];
    const districts: StableDemoDistrict[] = [];
    const buildings: StableDemoBuilding[] = [];

    for (const feature of state.hierarchy.getFeatures()) {
        const entity = entityForFeature(feature, entities);
        if (entity === undefined) continue;
        if (feature.role === "continent") {
            const placement = state.layout.getRegionPlacementByFeatureId(feature.id);
            if (placement !== undefined) {
                continents.push({ feature, name: displayName(entity), bounds: placement.bounds });
            }
        } else if (feature.role === "district") {
            const placement = state.layout.getRegionPlacementByFeatureId(feature.id);
            if (placement !== undefined) {
                districts.push({
                    feature,
                    name: displayName(entity),
                    bounds: placement.bounds,
                    isRuined: state.appearance.getAppearance(feature.id)?.condition === "ruined",
                });
            }
        } else {
            const placement = state.layout.getSitePlacementByFeatureId(feature.id);
            if (placement !== undefined) {
                buildings.push({
                    feature,
                    title: displayName(entity),
                    position: placement.position,
                    tracks: Object.freeze(
                        state.hierarchy
                            .getContentsByContainerId(feature.id)
                            .map(({ knowledgeNodeId }) => entities.get(knowledgeNodeId))
                            .filter((track): track is MusicEntity => track?.kind === "track")
                    ),
                });
            }
        }
    }

    return Object.freeze({
        catalog,
        continents: Object.freeze(continents),
        districts: Object.freeze(districts),
        buildings: Object.freeze(buildings),
    });
}

export function getEntityByKnowledgeNodeId(
    catalog: MusicCatalog,
    knowledgeNodeId: string
): MusicEntity | undefined {
    return catalog
        .getEntities()
        .find((entity) => musicKnowledgeNodeId(entity.kind, entity.id) === knowledgeNodeId);
}

function indexEntities(catalog: MusicCatalog): ReadonlyMap<string, MusicEntity> {
    return new Map(
        catalog
            .getEntities()
            .map((entity) => [musicKnowledgeNodeId(entity.kind, entity.id), entity] as const)
    );
}

function entityForFeature(
    feature: GeographicFeature,
    entities: ReadonlyMap<string, MusicEntity>
): MusicEntity | undefined {
    return feature.sourceKnowledgeNodeId === undefined
        ? undefined
        : entities.get(feature.sourceKnowledgeNodeId);
}

function displayName(entity: MusicEntity): string {
    return entity.name ?? entity.title ?? entity.id;
}
