import type { KnowledgeGraph } from "../knowledge";
import { MusicInterpreter, type MusicCatalog, type MusicEntityKind } from "../music";
import { MusicJsonImporter } from "../music/import";
import type { LabelDescriptor, LabelProvider } from "../render";
import type { GeographicWorld, WorldConfig } from "../world";
import { WorldGenerator } from "../world";

export interface MusicAtlasSnapshot {
    readonly catalog: MusicCatalog;
    readonly graph: KnowledgeGraph;
    readonly world: GeographicWorld;
    readonly labels: LabelProvider;
    readonly arrivalZoom: ArrivalZoomProvider;
    readonly seed: number;
}

export type ArrivalZoomProvider = (knowledgeNodeId: string) => number | undefined;

/** Runs the complete deterministic application pipeline from JSON V1 to geography. */
export function createMusicAtlasSnapshot(
    json: string,
    worldConfig: WorldConfig
): MusicAtlasSnapshot {
    const imported = new MusicJsonImporter().parse(json);
    const seed = imported.metadata.seed;
    if (seed === undefined) {
        throw new Error("The navigable map document must provide metadata.seed.");
    }

    const graph = new MusicInterpreter().interpret(imported.catalog);
    const world = new WorldGenerator().generate(seed, worldConfig, graph);
    const labels = createMusicLabelProvider(imported.catalog);
    const arrivalZoom = createMusicArrivalZoomProvider(imported.catalog);
    return Object.freeze({ catalog: imported.catalog, graph, world, labels, arrivalZoom, seed });
}

/** Showcase presentation policy; values are deliberately independent from Music domain data. */
export function createMusicArrivalZoomProvider(catalog: MusicCatalog): ArrivalZoomProvider {
    const zoomByKnowledgeNodeId = new Map<string, number>();
    for (const entity of catalog.getEntities()) {
        const arrivalZoom = arrivalZoomByKind[entity.kind];
        if (arrivalZoom !== undefined) {
            zoomByKnowledgeNodeId.set(`music:${entity.kind}:${entity.id}`, arrivalZoom);
        }
    }
    return (knowledgeNodeId: string): number | undefined =>
        zoomByKnowledgeNodeId.get(knowledgeNodeId);
}

export function createMusicLabelProvider(catalog: MusicCatalog): LabelProvider {
    const labels = new Map<string, LabelDescriptor>();
    for (const entity of catalog.getEntities()) {
        const label =
            entity.kind === "album" || entity.kind === "track"
                ? entity.title
                : entity.kind === "artist" || entity.kind === "label" || entity.kind === "playlist"
                  ? entity.name
                  : undefined;
        if (label !== undefined) {
            const detail = labelDetailByKind[entity.kind];
            if (detail !== undefined) {
                labels.set(
                    `music:${entity.kind}:${entity.id}`,
                    Object.freeze({
                        text: label,
                        ...detail,
                        ...(entity.kind === "artist" ? { landmarkKind: "city" as const } : {}),
                    })
                );
            }
        }
    }
    return (knowledgeNodeId: string): LabelDescriptor | undefined => labels.get(knowledgeNodeId);
}

// Showcase priorities are application presentation policy, not Music or Renderer semantics.
const labelDetailByKind: Readonly<
    Partial<Record<MusicEntityKind, Readonly<{ priority: number; minZoom: number }>>>
> = Object.freeze({
    artist: Object.freeze({ priority: 100, minZoom: 0 }),
    playlist: Object.freeze({ priority: 85, minZoom: 7 }),
    label: Object.freeze({ priority: 75, minZoom: 9 }),
    album: Object.freeze({ priority: 50, minZoom: 14 }),
    track: Object.freeze({ priority: 20, minZoom: 22 }),
});

const arrivalZoomByKind: Readonly<Partial<Record<MusicEntityKind, number>>> = Object.freeze({
    artist: 20,
    album: 16,
    track: 24,
    label: 12,
    playlist: 14,
});
