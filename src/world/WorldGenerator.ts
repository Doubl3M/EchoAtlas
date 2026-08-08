import { Seed, type SeedInput } from "../engine/math";
import { TerrainGenerator } from "../engine/terrain";
import { KnowledgeGraph } from "../knowledge";

import { GeographicWorld } from "./GeographicWorld";
import { placeKnowledgeNodes } from "./IndexedWorldPlacement";
import { WorldConfig } from "./WorldConfig";
import { WorldConnection } from "./WorldConnection";
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
        const positions = placeKnowledgeNodes(seed, config, nodes, relations);
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
