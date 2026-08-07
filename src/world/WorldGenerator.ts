import { DeterministicRandom, Seed, type SeedInput } from "../engine/math";
import { TerrainGenerator } from "../engine/terrain";
import { KnowledgeGraph, type KnowledgeRelation } from "../knowledge";

import { GeographicWorld } from "./GeographicWorld";
import { WorldConfig } from "./WorldConfig";
import { WorldConnection } from "./WorldConnection";
import { WorldLocation } from "./WorldLocation";

interface MutablePosition {
    x: number;
    y: number;
}

/** Stateless deterministic translation from semantic graph to geographic snapshot. */
export class WorldGenerator {
    public generate(
        seed: SeedInput | Seed,
        config: WorldConfig,
        graph: KnowledgeGraph
    ): GeographicWorld {
        const heightField = new TerrainGenerator().generate(seed, config.terrain);
        const positions = this.createInitialPositions(seed, config, graph);
        this.relaxPositions(positions, config, graph);

        const locations = graph.getNodes().map((node) => {
            const position = positions.get(node.id);
            if (position === undefined) {
                throw new Error(`Missing generated position for node ID: ${node.id}`);
            }
            // A continuous position uses its containing cell; the upper clamp protects bounds.
            const terrainX = Math.min(config.width - 1, Math.floor(position.x));
            const terrainY = Math.min(config.height - 1, Math.floor(position.y));
            return new WorldLocation(
                {
                    knowledgeNodeId: node.id,
                    x: position.x,
                    y: position.y,
                    elevation: heightField.get(terrainX, terrainY),
                },
                config.width,
                config.height
            );
        });
        const connections = graph.getRelations().map(
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

    private createInitialPositions(
        seed: SeedInput | Seed,
        config: WorldConfig,
        graph: KnowledgeGraph
    ): Map<string, MutablePosition> {
        const random = new DeterministicRandom(seed);
        const positions = new Map<string, MutablePosition>();

        for (const node of graph.getNodes()) {
            const nodeRandom = random.fork(`world-location:${node.id}`);
            positions.set(node.id, {
                x: this.randomCoordinate(nodeRandom, config.width),
                y: this.randomCoordinate(nodeRandom, config.height),
            });
        }
        return positions;
    }

    private randomCoordinate(random: DeterministicRandom, size: number): number {
        return size === 1 ? 0 : random.nextRange(0, size - 1);
    }

    private relaxPositions(
        positions: Map<string, MutablePosition>,
        config: WorldConfig,
        graph: KnowledgeGraph
    ): void {
        const nodeIds = graph.getNodes().map(({ id }) => id);
        for (let iteration = 0; iteration < config.placementIterations; iteration += 1) {
            // Accumulate every force from one position snapshot before moving any node.
            const displacements = new Map<string, MutablePosition>(
                nodeIds.map((id) => [id, { x: 0, y: 0 }])
            );
            this.applyRepulsion(nodeIds, positions, displacements, config.repulsionStrength);
            this.applyAttraction(
                graph.getRelations(),
                positions,
                displacements,
                config.attractionStrength
            );
            this.applyDisplacements(nodeIds, positions, displacements, config);
        }
    }

    private applyRepulsion(
        nodeIds: readonly string[],
        positions: ReadonlyMap<string, MutablePosition>,
        displacements: Map<string, MutablePosition>,
        strength: number
    ): void {
        for (let leftIndex = 0; leftIndex < nodeIds.length; leftIndex += 1) {
            for (let rightIndex = leftIndex + 1; rightIndex < nodeIds.length; rightIndex += 1) {
                const leftId = nodeIds[leftIndex];
                const rightId = nodeIds[rightIndex];
                const left = this.requirePosition(positions, leftId);
                const right = this.requirePosition(positions, rightId);
                let deltaX = left.x - right.x;
                const deltaY = left.y - right.y;

                // Exact collisions separate along the ID-ordered x axis without randomness.
                if (deltaX === 0 && deltaY === 0) {
                    deltaX = leftId < rightId ? -1 : 1;
                }

                const distanceSquared = deltaX * deltaX + deltaY * deltaY;
                // Unit softening is an algorithm invariant that prevents division by zero.
                const scale = strength / (distanceSquared + 1);
                this.addDisplacement(displacements, leftId, deltaX * scale, deltaY * scale);
                this.addDisplacement(displacements, rightId, -deltaX * scale, -deltaY * scale);
            }
        }
    }

    private applyAttraction(
        relations: readonly KnowledgeRelation[],
        positions: ReadonlyMap<string, MutablePosition>,
        displacements: Map<string, MutablePosition>,
        strength: number
    ): void {
        // Knowledge weights have no normalized geographic meaning, so topology alone attracts.
        for (const relation of relations) {
            const source = this.requirePosition(positions, relation.sourceId);
            const target = this.requirePosition(positions, relation.targetId);
            const deltaX = (target.x - source.x) * strength;
            const deltaY = (target.y - source.y) * strength;
            this.addDisplacement(displacements, relation.sourceId, deltaX, deltaY);
            this.addDisplacement(displacements, relation.targetId, -deltaX, -deltaY);
        }
    }

    private applyDisplacements(
        nodeIds: readonly string[],
        positions: Map<string, MutablePosition>,
        displacements: ReadonlyMap<string, MutablePosition>,
        config: WorldConfig
    ): void {
        for (const nodeId of nodeIds) {
            const position = this.requirePosition(positions, nodeId);
            const displacement = this.requirePosition(displacements, nodeId);
            position.x = this.clamp(position.x + displacement.x, 0, config.width - 1);
            position.y = this.clamp(position.y + displacement.y, 0, config.height - 1);
        }
    }

    private addDisplacement(
        displacements: Map<string, MutablePosition>,
        nodeId: string,
        x: number,
        y: number
    ): void {
        const displacement = this.requirePosition(displacements, nodeId);
        displacement.x += x;
        displacement.y += y;
    }

    private requirePosition(
        positions: ReadonlyMap<string, MutablePosition>,
        nodeId: string
    ): MutablePosition {
        const position = positions.get(nodeId);
        if (position === undefined) {
            throw new Error(`Missing position for node ID: ${nodeId}`);
        }
        return position;
    }

    private clamp(value: number, minimum: number, maximum: number): number {
        return Math.min(maximum, Math.max(minimum, value));
    }
}
