import { Seed, type SeedInput } from "../engine/math";
import { TerrainGenerator } from "../engine/terrain";
import { KnowledgeGraph } from "../knowledge";

import { GeographicWorld } from "./GeographicWorld";
import { resolveWorldPlacementStrategy } from "./resolveWorldPlacementStrategy";
import { WorldConfig } from "./WorldConfig";
import { WorldConnection } from "./WorldConnection";
import { createWorldInitialPositions } from "./WorldInitialPositions";
import { WorldLocation } from "./WorldLocation";
import { WorldTerrainMapping } from "./WorldTerrainMapping";

/** Stateless deterministic translation from semantic graph to geographic snapshot. */
export class WorldGenerator {
    public generate(
        seed: SeedInput | Seed,
        config: WorldConfig,
        graph: KnowledgeGraph
    ): GeographicWorld {
        const heightField = new TerrainGenerator().generate(seed, config.terrain);
        const nodes = graph.getNodes();
        const relations = graph.getRelations();
        const nodeIds = nodes.map(({ id }) => id);
        const initialPositions = createWorldInitialPositions(
            seed,
            nodeIds,
            config.width,
            config.height
        );
        const placementStrategy = resolveWorldPlacementStrategy(config.generationVersion);
        const positions = placementStrategy.place({
            nodeIds,
            relations,
            initialPositions,
            width: config.width,
            height: config.height,
            placementIterations: config.placementIterations,
            attractionStrength: config.attractionStrength,
            repulsionStrength: config.repulsionStrength,
        });
        const terrainMapping = new WorldTerrainMapping(
            config.width,
            config.height,
            heightField.width,
            heightField.height
        );

        const locations = nodes.map((node, index) => {
            const x = positions.x[index];
            const y = positions.y[index];
            const terrainCell = terrainMapping.worldToTerrainCell(x, y);
            return new WorldLocation(
                {
                    knowledgeNodeId: node.id,
                    x,
                    y,
                    elevation: heightField.get(terrainCell.x, terrainCell.y),
                },
                config.width,
                config.height
            );
        });
        const connections = relations.map(
            (relation) =>
                new WorldConnection({
                    knowledgeRelationId: relation.id,
                    sourceKnowledgeNodeId: relation.sourceId,
                    targetKnowledgeNodeId: relation.targetId,
                })
        );

        return new GeographicWorld({
            width: config.width,
            height: config.height,
            heightField,
            locations,
            connections,
        });
    }
}
