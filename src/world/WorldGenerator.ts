import { Seed, type SeedInput } from "../engine/math";
import { TerrainGenerator } from "../engine/terrain";
import { KnowledgeGraph } from "../knowledge";

import { GeographicWorld } from "./GeographicWorld";
import { placeKnowledgeNodes } from "./IndexedWorldPlacement";
import { WorldConfig } from "./WorldConfig";
import { WorldConnection } from "./WorldConnection";
import { WorldLocation } from "./WorldLocation";

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

        const locations = nodes.map((node, index) => {
            // A continuous position uses its containing cell; the upper clamp protects bounds.
            const x = positions.x[index];
            const y = positions.y[index];
            const terrainX = Math.min(config.width - 1, Math.floor(x));
            const terrainY = Math.min(config.height - 1, Math.floor(y));
            return new WorldLocation(
                {
                    knowledgeNodeId: node.id,
                    x,
                    y,
                    elevation: heightField.get(terrainX, terrainY),
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
