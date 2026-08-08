import type { KnowledgeGraph } from "../knowledge";
import { MusicInterpreter, type MusicCatalog } from "../music";
import { MusicJsonImporter } from "../music/import";
import type { LabelProvider } from "../render";
import type { GeographicWorld, WorldConfig } from "../world";
import { WorldGenerator } from "../world";

export interface MusicAtlasSnapshot {
    readonly catalog: MusicCatalog;
    readonly graph: KnowledgeGraph;
    readonly world: GeographicWorld;
    readonly labels: LabelProvider;
    readonly seed: number;
}

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
    return Object.freeze({ catalog: imported.catalog, graph, world, labels, seed });
}

export function createMusicLabelProvider(catalog: MusicCatalog): LabelProvider {
    const labels = new Map<string, string>();
    for (const entity of catalog.getEntities()) {
        const label =
            entity.kind === "album" || entity.kind === "track"
                ? entity.title
                : entity.kind === "artist" || entity.kind === "label" || entity.kind === "playlist"
                  ? entity.name
                  : undefined;
        if (label !== undefined) {
            labels.set(`music:${entity.kind}:${entity.id}`, label);
        }
    }
    return (knowledgeNodeId: string): string | undefined => labels.get(knowledgeNodeId);
}
