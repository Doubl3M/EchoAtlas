import { describe, expect, it } from "vitest";

import { Seed } from "../../src/engine/math";
import { TerrainConfig } from "../../src/engine/terrain";
import { KnowledgeGraph, KnowledgeNode, KnowledgeRelation } from "../../src/knowledge";
import { GeographicWorld, WorldConfig, WorldGenerator } from "../../src/world";

function config(width = 7, height = 5): WorldConfig {
    return new WorldConfig({
        width,
        height,
        placementIterations: 8,
        attractionStrength: 0.035,
        repulsionStrength: 0.25,
        terrain: new TerrainConfig({
            width,
            height,
            baseFrequency: 0.17,
            octaves: 3,
            persistence: 0.55,
            lacunarity: 2,
            offsetX: -1.5,
            offsetY: -2.25,
        }),
    });
}

function node(id: string, weight = 1): KnowledgeNode {
    return new KnowledgeNode({ id, kind: "concept", weight });
}

function relation(id: string, sourceId: string, targetId: string, weight = 1): KnowledgeRelation {
    return new KnowledgeRelation({ id, sourceId, targetId, kind: "association", weight });
}

function observable(world: GeographicWorld): object {
    return {
        locations: world.getLocations().map((location) => ({ ...location })),
        connections: world.getConnections().map((connection) => ({ ...connection })),
        terrain: world.heightField.toArray(),
    };
}

describe("WorldGenerator", () => {
    it("generates an empty world and its terrain", () => {
        const world = new WorldGenerator().generate("empty", config(), new KnowledgeGraph());

        expect(world.getLocations()).toEqual([]);
        expect(world.getConnections()).toEqual([]);
        expect(world.heightField.width).toBe(7);
        expect(world.heightField.height).toBe(5);
    });

    it("generates exactly one bounded location for one node", () => {
        const world = new WorldGenerator().generate(
            1,
            config(1, 1),
            new KnowledgeGraph([node("A")])
        );
        const location = world.getLocationByKnowledgeNodeId("A");

        expect(world.getLocations()).toHaveLength(1);
        expect(location).toEqual({
            knowledgeNodeId: "A",
            x: 0,
            y: 0,
            elevation: world.heightField.get(0, 0),
        });
    });

    it.each([
        [1, 5],
        [5, 1],
    ])("supports a deterministic %i × %i world", (width, height) => {
        const graph = new KnowledgeGraph([node("A"), node("B"), node("C")]);
        const generator = new WorldGenerator();
        const first = generator.generate("thin-world", config(width, height), graph);
        const second = generator.generate("thin-world", config(width, height), graph);

        expect(observable(second)).toEqual(observable(first));
        for (const location of first.getLocations()) {
            expect(location.x).toBeGreaterThanOrEqual(0);
            expect(location.x).toBeLessThanOrEqual(width - 1);
            expect(location.y).toBeGreaterThanOrEqual(0);
            expect(location.y).toBeLessThanOrEqual(height - 1);
            expect(location.elevation).toBe(
                first.heightField.get(Math.floor(location.x), Math.floor(location.y))
            );
        }
    });

    it("resolves exact initial-position collisions without non-finite values", () => {
        const graph = new KnowledgeGraph([node("A"), node("B"), node("C")]);
        const world = new WorldGenerator().generate("collision", config(1, 1), graph);

        for (const location of world.getLocations()) {
            expect(location.x).toBe(0);
            expect(location.y).toBe(0);
            expect(Number.isFinite(location.x)).toBe(true);
            expect(Number.isFinite(location.y)).toBe(true);
            expect(Number.isFinite(location.elevation)).toBe(true);
        }
    });

    it("places multiple unrelated nodes deterministically", () => {
        const graph = new KnowledgeGraph([node("C"), node("A"), node("B")]);
        const world = new WorldGenerator().generate("unrelated", config(), graph);

        expect(world.getLocations().map(({ knowledgeNodeId }) => knowledgeNodeId)).toEqual([
            "A",
            "B",
            "C",
        ]);
        expect(new Set(world.getLocations().map(({ x, y }) => `${x}:${y}`)).size).toBeGreaterThan(
            1
        );
    });

    it("uses relations during placement", () => {
        const nodes = [node("A"), node("B")];
        const unrelated = new WorldGenerator().generate(
            "relations",
            config(),
            new KnowledgeGraph(nodes)
        );
        const related = new WorldGenerator().generate(
            "relations",
            config(),
            new KnowledgeGraph(nodes, [relation("R", "A", "B")])
        );

        expect(related.getLocations()).not.toEqual(unrelated.getLocations());
    });

    it("preserves self-relations and parallel directed relations", () => {
        const graph = new KnowledgeGraph(
            [node("A"), node("B")],
            [relation("R3", "A", "B"), relation("R1", "A", "A"), relation("R2", "A", "B")]
        );
        const world = new WorldGenerator().generate("connections", config(), graph);

        expect(world.getConnections()).toEqual([
            {
                knowledgeRelationId: "R1",
                sourceKnowledgeNodeId: "A",
                targetKnowledgeNodeId: "A",
            },
            {
                knowledgeRelationId: "R2",
                sourceKnowledgeNodeId: "A",
                targetKnowledgeNodeId: "B",
            },
            {
                knowledgeRelationId: "R3",
                sourceKnowledgeNodeId: "A",
                targetKnowledgeNodeId: "B",
            },
        ]);
    });

    it("applies no attraction displacement for a self-relation", () => {
        const nodes = [node("A"), node("B")];
        const withoutSelfRelation = new WorldGenerator().generate(
            "self-relation",
            config(),
            new KnowledgeGraph(nodes)
        );
        const withSelfRelation = new WorldGenerator().generate(
            "self-relation",
            config(),
            new KnowledgeGraph(nodes, [relation("R:self", "A", "A")])
        );

        expect(withSelfRelation.getLocations()).toEqual(withoutSelfRelation.getLocations());
    });

    it("keeps every coordinate bounded and samples normalized terrain elevations", () => {
        const graph = new KnowledgeGraph(
            Array.from({ length: 30 }, (_, index) => node(`node:${index}`))
        );
        const world = new WorldGenerator().generate("bounds", config(), graph);

        for (const location of world.getLocations()) {
            expect(location.x).toBeGreaterThanOrEqual(0);
            expect(location.x).toBeLessThanOrEqual(world.width - 1);
            expect(location.y).toBeGreaterThanOrEqual(0);
            expect(location.y).toBeLessThanOrEqual(world.height - 1);
            expect(location.elevation).toBeGreaterThanOrEqual(0);
            expect(location.elevation).toBeLessThanOrEqual(1);
            expect(location.elevation).toBe(
                world.heightField.get(Math.floor(location.x), Math.floor(location.y))
            );
        }
    });

    it("is exactly reproducible and independent of graph input order", () => {
        const nodes = [node("A", -4), node("B", 8), node("C", 0.5)];
        const relations = [relation("R1", "A", "B", 2.5), relation("R2", "B", "C", -1)];
        const firstGraph = new KnowledgeGraph(nodes, relations);
        const reversedGraph = new KnowledgeGraph([...nodes].reverse(), [...relations].reverse());
        const generator = new WorldGenerator();
        const first = generator.generate(new Seed(42), config(), firstGraph);
        generator.generate("unrelated", config(), firstGraph);
        const repeated = generator.generate(new Seed(42), config(), firstGraph);
        const reversed = generator.generate(new Seed(42), config(), reversedGraph);

        expect(observable(repeated)).toEqual(observable(first));
        expect(observable(reversed)).toEqual(observable(first));
    });

    it("derives each initial position only from the seed and stable node ID", () => {
        const initialOnly = new WorldConfig({
            ...config(),
            placementIterations: 0,
        });
        const generator = new WorldGenerator();
        const existing = generator.generate(
            42,
            initialOnly,
            new KnowledgeGraph([node("A"), node("B")])
        );
        const extended = generator.generate(
            new Seed(42),
            initialOnly,
            new KnowledgeGraph([node("A"), node("B"), node("C")])
        );

        expect(extended.getLocationByKnowledgeNodeId("A")).toEqual(
            existing.getLocationByKnowledgeNodeId("A")
        );
        expect(extended.getLocationByKnowledgeNodeId("B")).toEqual(
            existing.getLocationByKnowledgeNodeId("B")
        );
    });

    it("keeps numeric and textual seed contracts distinct and reproducible", () => {
        const graph = new KnowledgeGraph([node("A"), node("B")]);
        const generator = new WorldGenerator();
        const numeric = generator.generate(42, config(), graph);
        const wrappedNumeric = generator.generate(new Seed(42), config(), graph);
        const textual = generator.generate("42", config(), graph);

        expect(observable(wrappedNumeric)).toEqual(observable(numeric));
        expect(observable(textual)).not.toEqual(observable(numeric));
    });

    it("produces an observable difference for a different seed", () => {
        const graph = new KnowledgeGraph([node("A"), node("B")], [relation("R", "A", "B")]);
        const first = new WorldGenerator().generate("seed:A", config(), graph);
        const second = new WorldGenerator().generate("seed:B", config(), graph);

        expect(observable(second)).not.toEqual(observable(first));
    });

    it("does not share mutable state between generations or with consumers", () => {
        const graph = new KnowledgeGraph([node("A"), node("B")], [relation("R", "A", "B")]);
        const generator = new WorldGenerator();
        const first = generator.generate(7, config(), graph);
        const second = generator.generate(7, config(), graph);
        const terrainCopy = first.heightField.toArray();
        terrainCopy.fill(0);

        expect(first).not.toBe(second);
        expect(first.heightField).not.toBe(second.heightField);
        expect(first.getLocations()).not.toBe(second.getLocations());
        expect(first.getLocations()[0]).not.toBe(second.getLocations()[0]);
        expect(observable(first)).toEqual(observable(second));
        expect(first.heightField.toArray()).not.toEqual(terrainCopy);
        expect(() =>
            Object.assign(first as { heightField: typeof first.heightField }, {
                heightField: second.heightField,
            })
        ).toThrow(TypeError);
    });

    it("reconstructs A, R1, B, R2, C without using coordinates", () => {
        const graph = new KnowledgeGraph(
            [node("C"), node("A"), node("B")],
            [relation("R2", "B", "C"), relation("R1", "A", "B")]
        );
        const world = new WorldGenerator().generate("path", config(), graph);
        const first = world.getConnectionByKnowledgeRelationId("R1");
        const second = world.getConnectionByKnowledgeRelationId("R2");

        expect([
            world.getLocationByKnowledgeNodeId("A")?.knowledgeNodeId,
            first?.knowledgeRelationId,
            world.getLocationByKnowledgeNodeId(first?.targetKnowledgeNodeId ?? "")?.knowledgeNodeId,
            second?.knowledgeRelationId,
            world.getLocationByKnowledgeNodeId(second?.targetKnowledgeNodeId ?? "")
                ?.knowledgeNodeId,
        ]).toEqual(["A", "R1", "B", "R2", "C"]);
    });

    it("keeps exact reference locations for the procedural generation contract", () => {
        const graph = new KnowledgeGraph(
            [node("C", 0.5), node("A", 2), node("B", -1)],
            [relation("R2", "B", "C"), relation("R1", "A", "B", 3.25)]
        );
        const world = new WorldGenerator().generate("world-reference", config(), graph);

        expect(world.getLocations()).toEqual([
            {
                knowledgeNodeId: "A",
                x: 3.505582950892608,
                y: 0.871969164165904,
                elevation: 0.4396528135863502,
            },
            {
                knowledgeNodeId: "B",
                x: 4.383326995072095,
                y: 2.5287156670669972,
                elevation: 0.37745055730305277,
            },
            {
                knowledgeNodeId: "C",
                x: 0.957596330668888,
                y: 2.526056440978173,
                elevation: 0.38308191526001695,
            },
        ]);
        expect(world.getConnections()).toEqual([
            {
                knowledgeRelationId: "R1",
                sourceKnowledgeNodeId: "A",
                targetKnowledgeNodeId: "B",
            },
            {
                knowledgeRelationId: "R2",
                sourceKnowledgeNodeId: "B",
                targetKnowledgeNodeId: "C",
            },
        ]);
    });

    it("does not interpret Knowledge Graph weights as geographic forces", () => {
        const nodes = [node("A", 1), node("B", 2), node("C", 3)];
        const first = new KnowledgeGraph(nodes, [
            relation("R1", "A", "B", 0.25),
            relation("R2", "B", "C", 4),
        ]);
        const second = new KnowledgeGraph(
            nodes.map(({ id, weight }) => node(id, -weight)),
            [relation("R1", "A", "B", -100), relation("R2", "B", "C", 500)]
        );
        const generator = new WorldGenerator();

        expect(generator.generate("weights", config(), second).getLocations()).toEqual(
            generator.generate("weights", config(), first).getLocations()
        );
    });
});
