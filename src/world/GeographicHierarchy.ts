import { GeographicContent } from "./GeographicContent";
import type { GeographicContentId } from "./GeographicContent";
import { GeographicFeature } from "./GeographicFeature";
import type { GeographicFeatureId } from "./GeographicFeature";

export interface GeographicHierarchyOptions {
    readonly features?: readonly GeographicFeature[];
    readonly contents?: readonly GeographicContent[];
}

/** Immutable, geometry-free geographic containment snapshot in canonical ID order. */
export class GeographicHierarchy {
    private static readonly emptyFeatures: readonly GeographicFeature[] = Object.freeze([]);
    private static readonly emptyContents: readonly GeographicContent[] = Object.freeze([]);

    private readonly features: readonly GeographicFeature[];
    private readonly contents: readonly GeographicContent[];
    private readonly featuresById: ReadonlyMap<GeographicFeatureId, GeographicFeature>;
    private readonly contentsById: ReadonlyMap<GeographicContentId, GeographicContent>;
    private readonly featuresByKnowledgeNodeId: ReadonlyMap<string, readonly GeographicFeature[]>;
    private readonly contentsByKnowledgeNodeId: ReadonlyMap<string, readonly GeographicContent[]>;
    private readonly childrenByParentId: ReadonlyMap<
        GeographicFeatureId,
        readonly GeographicFeature[]
    >;
    private readonly contentsByContainerId: ReadonlyMap<
        GeographicFeatureId,
        readonly GeographicContent[]
    >;

    public constructor(options: GeographicHierarchyOptions = {}) {
        this.features = Object.freeze([...(options.features ?? [])].sort(compareById));
        this.contents = Object.freeze([...(options.contents ?? [])].sort(compareById));
        this.featuresById = this.indexFeatures(this.features);
        this.validateFeatureParents(this.features);
        this.validateAcyclicContainment(this.features);
        this.contentsById = this.indexContents(this.contents);
        this.validateContentContainers(this.contents);
        this.validateUniqueContentMappings(this.contents);
        this.featuresByKnowledgeNodeId = this.indexByOptionalKey(
            this.features,
            ({ sourceKnowledgeNodeId }) => sourceKnowledgeNodeId
        );
        this.contentsByKnowledgeNodeId = this.indexByKey(
            this.contents,
            ({ knowledgeNodeId }) => knowledgeNodeId
        );
        this.childrenByParentId = this.indexByOptionalKey(
            this.features,
            ({ parentId }) => parentId
        );
        this.contentsByContainerId = this.indexByKey(
            this.contents,
            ({ containerFeatureId }) => containerFeatureId
        );
        Object.freeze(this);
    }

    public getFeatures(): readonly GeographicFeature[] {
        return this.features;
    }

    public getContents(): readonly GeographicContent[] {
        return this.contents;
    }

    public getFeatureById(id: GeographicFeatureId): GeographicFeature | undefined {
        return this.featuresById.get(id);
    }

    public getContentById(id: GeographicContentId): GeographicContent | undefined {
        return this.contentsById.get(id);
    }

    public getFeaturesByKnowledgeNodeId(knowledgeNodeId: string): readonly GeographicFeature[] {
        return (
            this.featuresByKnowledgeNodeId.get(knowledgeNodeId) ?? GeographicHierarchy.emptyFeatures
        );
    }

    public getContentsByKnowledgeNodeId(knowledgeNodeId: string): readonly GeographicContent[] {
        return (
            this.contentsByKnowledgeNodeId.get(knowledgeNodeId) ?? GeographicHierarchy.emptyContents
        );
    }

    public getParent(featureId: GeographicFeatureId): GeographicFeature | undefined {
        const parentId = this.featuresById.get(featureId)?.parentId;
        return parentId === undefined ? undefined : this.featuresById.get(parentId);
    }

    public getChildren(featureId: GeographicFeatureId): readonly GeographicFeature[] {
        return this.childrenByParentId.get(featureId) ?? GeographicHierarchy.emptyFeatures;
    }

    public getContentsByContainerId(
        containerFeatureId: GeographicFeatureId
    ): readonly GeographicContent[] {
        return (
            this.contentsByContainerId.get(containerFeatureId) ?? GeographicHierarchy.emptyContents
        );
    }

    public getContainerForContent(contentId: GeographicContentId): GeographicFeature | undefined {
        const containerId = this.contentsById.get(contentId)?.containerFeatureId;
        return containerId === undefined ? undefined : this.featuresById.get(containerId);
    }

    private indexFeatures(
        features: readonly GeographicFeature[]
    ): ReadonlyMap<GeographicFeatureId, GeographicFeature> {
        const index = new Map<GeographicFeatureId, GeographicFeature>();
        for (const feature of features) {
            if (index.has(feature.id)) {
                throw new Error(`Duplicate geographic feature ID: ${feature.id}`);
            }
            index.set(feature.id, feature);
        }
        return index;
    }

    private indexContents(
        contents: readonly GeographicContent[]
    ): ReadonlyMap<GeographicContentId, GeographicContent> {
        const index = new Map<GeographicContentId, GeographicContent>();
        for (const content of contents) {
            if (index.has(content.id)) {
                throw new Error(`Duplicate geographic content ID: ${content.id}`);
            }
            index.set(content.id, content);
        }
        return index;
    }

    private validateFeatureParents(features: readonly GeographicFeature[]): void {
        for (const feature of features) {
            if (feature.parentId === feature.id) {
                throw new Error(`Geographic feature cannot contain itself: ${feature.id}`);
            }
            if (feature.parentId !== undefined && !this.featuresById.has(feature.parentId)) {
                throw new Error(`Unknown parent geographic feature ID: ${feature.parentId}`);
            }
        }
    }

    private validateAcyclicContainment(features: readonly GeographicFeature[]): void {
        for (const feature of features) {
            const ancestors = new Set<GeographicFeatureId>();
            let current: GeographicFeature | undefined = feature;
            while (current?.parentId !== undefined) {
                if (ancestors.has(current.id)) {
                    throw new Error(`Geographic containment cycle includes: ${current.id}`);
                }
                ancestors.add(current.id);
                current = this.featuresById.get(current.parentId);
            }
        }
    }

    private validateContentContainers(contents: readonly GeographicContent[]): void {
        for (const content of contents) {
            if (!this.featuresById.has(content.containerFeatureId)) {
                throw new Error(
                    `Unknown content container feature ID: ${content.containerFeatureId}`
                );
            }
        }
    }

    private validateUniqueContentMappings(contents: readonly GeographicContent[]): void {
        const mappings = new Set<string>();
        for (const content of contents) {
            const mapping = `${content.knowledgeNodeId}\u0000${content.containerFeatureId}`;
            if (mappings.has(mapping)) {
                throw new Error(
                    `Duplicate geographic content mapping: ${content.knowledgeNodeId} in ${content.containerFeatureId}`
                );
            }
            mappings.add(mapping);
        }
    }

    private indexByOptionalKey<T>(
        values: readonly T[],
        keyOf: (value: T) => string | undefined
    ): ReadonlyMap<string, readonly T[]> {
        return this.indexByKey(
            values.filter((value) => keyOf(value) !== undefined),
            (value) => keyOf(value) as string
        );
    }

    private indexByKey<T>(
        values: readonly T[],
        keyOf: (value: T) => string
    ): ReadonlyMap<string, readonly T[]> {
        const mutable = new Map<string, T[]>();
        for (const value of values) {
            const key = keyOf(value);
            const indexed = mutable.get(key) ?? [];
            indexed.push(value);
            mutable.set(key, indexed);
        }
        const index = new Map<string, readonly T[]>();
        for (const [key, indexed] of mutable) {
            index.set(key, Object.freeze(indexed));
        }
        return index;
    }
}

function compareById<T extends { readonly id: string }>(left: T, right: T): number {
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
