import type { KnowledgeGraph, KnowledgeRelation } from "../knowledge";
import {
    musicKnowledgeNodeId,
    musicKnowledgeNodeKind,
    type MusicCatalog,
    type MusicEntity,
    type MusicEntityKind,
} from "../music";
import {
    GeographicContent,
    GeographicFeature,
    GeographicHierarchy,
    type GeographicFeatureId,
} from "../world";
import {
    validateMusicGeographyInterpretationVersion,
    type MusicGeographyInterpretationVersion,
} from "./MusicGeographyInterpretationVersion";

export interface MusicGeographicInterpretationOptions {
    readonly catalog: MusicCatalog;
    readonly knowledgeGraph: KnowledgeGraph;
    readonly version: MusicGeographyInterpretationVersion;
}

/** Derives generic semantic geography using an explicit Music Atlas interpretation policy. */
export class MusicGeographicInterpreter {
    public interpret(options: MusicGeographicInterpretationOptions): GeographicHierarchy {
        validateMusicGeographyInterpretationVersion(options.version);

        const entities = this.indexGraphEntities(options.catalog, options.knowledgeGraph);
        const features = new Map<GeographicFeatureId, GeographicFeature>();
        const contents = new Map<string, GeographicContent>();
        const featureIdsByKnowledgeNodeId = new Map<string, GeographicFeatureId[]>();

        this.createContinents(entities, features, featureIdsByKnowledgeNodeId);
        this.createDistricts(
            options.knowledgeGraph.getRelations(),
            entities,
            features,
            featureIdsByKnowledgeNodeId
        );
        this.createBuildings(
            options.knowledgeGraph.getRelations(),
            entities,
            features,
            featureIdsByKnowledgeNodeId
        );
        this.createContents(
            options.knowledgeGraph.getRelations(),
            entities,
            featureIdsByKnowledgeNodeId,
            contents
        );

        return new GeographicHierarchy({
            features: [...features.values()],
            contents: [...contents.values()],
        });
    }

    private indexGraphEntities(
        catalog: MusicCatalog,
        graph: KnowledgeGraph
    ): ReadonlyMap<string, MusicEntity> {
        const entities = new Map<string, MusicEntity>();
        for (const entity of catalog.getEntities()) {
            const knowledgeNodeId = musicKnowledgeNodeId(entity.kind, entity.id);
            const node = graph.getNode(knowledgeNodeId);
            if (node?.kind === musicKnowledgeNodeKind(entity.kind)) {
                entities.set(knowledgeNodeId, entity);
            }
        }
        return entities;
    }

    private createContinents(
        entities: ReadonlyMap<string, MusicEntity>,
        features: Map<GeographicFeatureId, GeographicFeature>,
        featureIdsByKnowledgeNodeId: Map<string, GeographicFeatureId[]>
    ): void {
        for (const [knowledgeNodeId, entity] of entities) {
            if (entity.kind !== "genre") {
                continue;
            }
            const id = geographicIdentity("feature", "continent", knowledgeNodeId);
            this.addFeature(
                new GeographicFeature({
                    id,
                    role: "continent",
                    sourceKnowledgeNodeId: knowledgeNodeId,
                }),
                features,
                featureIdsByKnowledgeNodeId
            );
        }
    }

    private createDistricts(
        relations: readonly KnowledgeRelation[],
        entities: ReadonlyMap<string, MusicEntity>,
        features: Map<GeographicFeatureId, GeographicFeature>,
        featureIdsByKnowledgeNodeId: Map<string, GeographicFeatureId[]>
    ): void {
        for (const relation of relations) {
            if (!hasEndpointKinds(relation, entities, "genre", "artist")) {
                continue;
            }
            for (const continentId of featureIdsByKnowledgeNodeId.get(relation.sourceId) ?? []) {
                const id = geographicIdentity(
                    "feature",
                    "district",
                    continentId,
                    relation.targetId
                );
                this.addFeature(
                    new GeographicFeature({
                        id,
                        role: "district",
                        parentId: continentId,
                        sourceKnowledgeNodeId: relation.targetId,
                    }),
                    features,
                    featureIdsByKnowledgeNodeId
                );
            }
        }
    }

    private createBuildings(
        relations: readonly KnowledgeRelation[],
        entities: ReadonlyMap<string, MusicEntity>,
        features: Map<GeographicFeatureId, GeographicFeature>,
        featureIdsByKnowledgeNodeId: Map<string, GeographicFeatureId[]>
    ): void {
        for (const relation of relations) {
            if (!hasEndpointKinds(relation, entities, "artist", "album")) {
                continue;
            }
            for (const districtId of featureIdsByKnowledgeNodeId.get(relation.sourceId) ?? []) {
                const id = geographicIdentity("feature", "building", districtId, relation.targetId);
                this.addFeature(
                    new GeographicFeature({
                        id,
                        role: "building",
                        parentId: districtId,
                        sourceKnowledgeNodeId: relation.targetId,
                    }),
                    features,
                    featureIdsByKnowledgeNodeId
                );
            }
        }
    }

    private createContents(
        relations: readonly KnowledgeRelation[],
        entities: ReadonlyMap<string, MusicEntity>,
        featureIdsByKnowledgeNodeId: ReadonlyMap<string, readonly GeographicFeatureId[]>,
        contents: Map<string, GeographicContent>
    ): void {
        for (const relation of relations) {
            if (!hasEndpointKinds(relation, entities, "album", "track")) {
                continue;
            }
            for (const buildingId of featureIdsByKnowledgeNodeId.get(relation.sourceId) ?? []) {
                const id = geographicIdentity("content", buildingId, relation.targetId);
                contents.set(
                    id,
                    new GeographicContent({
                        id,
                        knowledgeNodeId: relation.targetId,
                        containerFeatureId: buildingId,
                    })
                );
            }
        }
    }

    private addFeature(
        feature: GeographicFeature,
        features: Map<GeographicFeatureId, GeographicFeature>,
        featureIdsByKnowledgeNodeId: Map<string, GeographicFeatureId[]>
    ): void {
        if (features.has(feature.id)) {
            return;
        }
        features.set(feature.id, feature);
        const knowledgeNodeId = feature.sourceKnowledgeNodeId;
        if (knowledgeNodeId !== undefined) {
            const ids = featureIdsByKnowledgeNodeId.get(knowledgeNodeId) ?? [];
            ids.push(feature.id);
            featureIdsByKnowledgeNodeId.set(knowledgeNodeId, ids);
        }
    }
}

function hasEndpointKinds(
    relation: KnowledgeRelation,
    entities: ReadonlyMap<string, MusicEntity>,
    sourceKind: MusicEntityKind,
    targetKind: MusicEntityKind
): boolean {
    return (
        entities.get(relation.sourceId)?.kind === sourceKind &&
        entities.get(relation.targetId)?.kind === targetKind
    );
}

function geographicIdentity(namespace: string, ...segments: readonly string[]): string {
    return `${namespace}|${segments.map((segment) => `${segment.length}:${segment}`).join("")}`;
}
