import { describe, expect, it } from "vitest";

import { HeightField } from "../../src/engine/terrain";
import { GeographicWorld, WorldConnection, WorldLocation } from "../../src/world";

function location(id: string): WorldLocation {
    return new WorldLocation({ knowledgeNodeId: id, x: 0, y: 0, elevation: 0.5 }, 2, 2);
}

function connection(id: string, source: string, target: string): WorldConnection {
    return new WorldConnection({
        knowledgeRelationId: id,
        sourceKnowledgeNodeId: source,
        targetKnowledgeNodeId: target,
    });
}

function heightField(): HeightField {
    return new HeightField(2, 2, [0, 0.25, 0.5, 1]);
}

describe("GeographicWorld", () => {
    it("represents an immutable empty world", () => {
        const world = new GeographicWorld({
            width: 2,
            height: 2,
            heightField: heightField(),
            locations: [],
            connections: [],
        });

        expect(world.getLocations()).toEqual([]);
        expect(world.getConnections()).toEqual([]);
        expect(world.getLocationByKnowledgeNodeId("missing")).toBeUndefined();
        expect(world.getConnectionByKnowledgeRelationId("missing")).toBeUndefined();
        expect(Object.isFrozen(world)).toBe(true);
    });

    it("copies and deterministically sorts collections by canonical IDs", () => {
        const locations = [location("b"), location("A"), location("a")];
        const connections = [connection("r:2", "A", "b"), connection("r:1", "a", "A")];
        const world = new GeographicWorld({
            width: 2,
            height: 2,
            heightField: heightField(),
            locations,
            connections,
        });
        locations.length = 0;
        connections.length = 0;

        expect(world.getLocations().map(({ knowledgeNodeId }) => knowledgeNodeId)).toEqual([
            "A",
            "a",
            "b",
        ]);
        expect(
            world.getConnections().map(({ knowledgeRelationId }) => knowledgeRelationId)
        ).toEqual(["r:1", "r:2"]);
        expect(Object.isFrozen(world.getLocations())).toBe(true);
        expect(Object.isFrozen(world.getConnections())).toBe(true);
        expect(() => (world.getLocations() as WorldLocation[]).pop()).toThrow(TypeError);
        expect(() => (world.getConnections() as WorldConnection[]).push(connections[0])).toThrow(
            TypeError
        );
    });

    it("finds locations and directed connections by Knowledge Graph identity", () => {
        const source = location("A");
        const target = location("B");
        const edge = connection("R", "A", "B");
        const world = new GeographicWorld({
            width: 2,
            height: 2,
            heightField: heightField(),
            locations: [source, target],
            connections: [edge],
        });

        expect(world.getLocationByKnowledgeNodeId("A")).toBe(source);
        expect(world.getConnectionByKnowledgeRelationId("R")).toBe(edge);
        expect(edge.sourceKnowledgeNodeId).toBe("A");
        expect(edge.targetKnowledgeNodeId).toBe("B");
    });

    it("accepts a terrain resolution independent of its logical dimensions", () => {
        const world = new GeographicWorld({
            width: 8,
            height: 4,
            heightField: heightField(),
            locations: [],
            connections: [],
        });

        expect(world.width).toBe(8);
        expect(world.height).toBe(4);
        expect(world.heightField.width).toBe(2);
        expect(world.heightField.height).toBe(2);
    });

    it("rejects a location outside the snapshot dimensions", () => {
        const outOfBounds = new WorldLocation(
            { knowledgeNodeId: "A", x: 2, y: 0, elevation: 0.5 },
            3,
            2
        );

        expect(
            () =>
                new GeographicWorld({
                    width: 2,
                    height: 2,
                    heightField: heightField(),
                    locations: [outOfBounds],
                    connections: [],
                })
        ).toThrow("Location for node ID A is outside world bounds.");
    });

    it("rejects duplicate locations and connections", () => {
        expect(
            () =>
                new GeographicWorld({
                    width: 2,
                    height: 2,
                    heightField: heightField(),
                    locations: [location("A"), location("A")],
                    connections: [],
                })
        ).toThrow("Duplicate location for node ID: A");

        expect(
            () =>
                new GeographicWorld({
                    width: 2,
                    height: 2,
                    heightField: heightField(),
                    locations: [location("A")],
                    connections: [connection("R", "A", "A"), connection("R", "A", "A")],
                })
        ).toThrow("Duplicate connection for relation ID: R");
    });

    it("rejects connections to unknown locations", () => {
        expect(
            () =>
                new GeographicWorld({
                    width: 2,
                    height: 2,
                    heightField: heightField(),
                    locations: [location("B")],
                    connections: [connection("R", "A", "B")],
                })
        ).toThrow("Unknown connection source node ID: A");

        expect(
            () =>
                new GeographicWorld({
                    width: 2,
                    height: 2,
                    heightField: heightField(),
                    locations: [location("A")],
                    connections: [connection("R", "A", "B")],
                })
        ).toThrow("Unknown connection target node ID: B");
    });
});
