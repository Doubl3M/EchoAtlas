import { describe, expect, it } from "vitest";

import { KnowledgeGraph, KnowledgeNode, KnowledgeRelation } from "../../src/knowledge";

function node(id: string): KnowledgeNode {
    return new KnowledgeNode({ id, kind: "concept", weight: 1 });
}

function relation(id: string, sourceId: string, targetId: string): KnowledgeRelation {
    return new KnowledgeRelation({ id, sourceId, targetId, kind: "association", weight: 1 });
}

function reconstructPath(graph: KnowledgeGraph): readonly string[] {
    const firstRelation = graph.getRelation("R1");
    const secondRelation = graph.getRelation("R2");
    return [
        graph.getNode("A")?.id ?? "",
        firstRelation?.id ?? "",
        graph.getNode(firstRelation?.targetId ?? "")?.id ?? "",
        secondRelation?.id ?? "",
        graph.getNode(secondRelation?.targetId ?? "")?.id ?? "",
    ];
}

describe("KnowledgeGraph", () => {
    it("represents an empty graph", () => {
        const graph = new KnowledgeGraph();

        expect(graph.getNodes()).toEqual([]);
        expect(graph.getRelations()).toEqual([]);
        expect(graph.getNode("missing")).toBeUndefined();
        expect(graph.getRelation("missing")).toBeUndefined();
        expect(graph.hasNode("missing")).toBe(false);
        expect(graph.hasRelation("missing")).toBe(false);
        expect(graph.getOutgoingRelations("missing")).toEqual([]);
        expect(graph.getIncomingRelations("missing")).toEqual([]);
    });

    it("finds nodes and relations by their exact IDs", () => {
        const source = node("node:A");
        const target = node("node:B");
        const edge = relation("relation:R", source.id, target.id);
        const graph = new KnowledgeGraph([source, target], [edge]);

        expect(graph.getNode("node:A")).toBe(source);
        expect(graph.getRelation("relation:R")).toBe(edge);
        expect(graph.hasNode("node:A")).toBe(true);
        expect(graph.hasRelation("relation:R")).toBe(true);
        expect(source.id).toBe("node:A");
        expect(edge.id).toBe("relation:R");
    });

    it("rejects duplicate node IDs", () => {
        expect(() => new KnowledgeGraph([node("A"), node("A")])).toThrow("Duplicate node ID: A");
    });

    it("rejects duplicate relation IDs", () => {
        expect(
            () =>
                new KnowledgeGraph(
                    [node("A"), node("B")],
                    [relation("R", "A", "B"), relation("R", "B", "A")]
                )
        ).toThrow("Duplicate relation ID: R");
    });

    it("rejects a relation with an unknown source", () => {
        expect(() => new KnowledgeGraph([node("B")], [relation("R", "A", "B")])).toThrow(
            "Unknown relation source ID: A"
        );
    });

    it("rejects a relation with an unknown target", () => {
        expect(() => new KnowledgeGraph([node("A")], [relation("R", "A", "B")])).toThrow(
            "Unknown relation target ID: B"
        );
    });

    it("returns incoming and outgoing relations without implicit symmetry", () => {
        const edge = relation("R", "A", "B");
        const graph = new KnowledgeGraph([node("A"), node("B")], [edge]);

        expect(graph.getOutgoingRelations("A")).toEqual([edge]);
        expect(graph.getIncomingRelations("B")).toEqual([edge]);
        expect(graph.getOutgoingRelations("B")).toEqual([]);
        expect(graph.getIncomingRelations("A")).toEqual([]);
    });

    it("supports distinct relation IDs regardless of endpoints and kinds", () => {
        const first = relation("R1", "A", "B");
        const second = new KnowledgeRelation({
            id: "R2",
            sourceId: "A",
            targetId: "B",
            kind: "different association",
            weight: 1,
        });
        const third = relation("R3", "A", "B");
        const graph = new KnowledgeGraph([node("A"), node("B")], [third, second, first]);

        expect(graph.getOutgoingRelations("A")).toEqual([first, second, third]);
    });

    it("allows an explicitly identified self-relation", () => {
        const selfRelation = relation("R:self", "A", "A");
        const graph = new KnowledgeGraph([node("A")], [selfRelation]);

        expect(graph.getOutgoingRelations("A")).toEqual([selfRelation]);
        expect(graph.getIncomingRelations("A")).toEqual([selfRelation]);
    });

    it("uses stable JavaScript lexical order independently of insertion order", () => {
        const nodes = [
            node("😀"),
            node("node:2"),
            node("Á"),
            node("a"),
            node("node:10"),
            node("Ω"),
            node("A"),
        ];
        const relations = [
            relation("relation:2", "A", "node:2"),
            relation("relation:10", "A", "node:10"),
            relation("relation:1", "node:2", "A"),
        ];
        const forward = new KnowledgeGraph(nodes, relations);
        const reverse = new KnowledgeGraph([...nodes].reverse(), [...relations].reverse());

        expect(forward.getNodes().map(({ id }) => id)).toEqual([
            "A",
            "a",
            "node:10",
            "node:2",
            "Á",
            "Ω",
            "😀",
        ]);
        expect(forward.getRelations().map(({ id }) => id)).toEqual([
            "relation:1",
            "relation:10",
            "relation:2",
        ]);
        expect(reverse.getNodes()).toEqual(forward.getNodes());
        expect(reverse.getRelations()).toEqual(forward.getRelations());
        expect(reverse.getOutgoingRelations("A")).toEqual(forward.getOutgoingRelations("A"));
    });

    it("copies inputs and rejects attempts to mutate returned arrays", () => {
        const nodes = [node("A"), node("B")];
        const edge = relation("R", "A", "B");
        const relations = [edge];
        const graph = new KnowledgeGraph(nodes, relations);
        nodes.length = 0;
        relations.length = 0;

        expect(Object.isFrozen(graph)).toBe(true);
        expect(Object.isFrozen(graph.getNodes())).toBe(true);
        expect(Object.isFrozen(graph.getRelations())).toBe(true);
        expect(Object.isFrozen(graph.getOutgoingRelations("A"))).toBe(true);
        expect(Object.isFrozen(graph.getIncomingRelations("B"))).toBe(true);
        expect(() => (graph.getNodes() as KnowledgeNode[]).push(node("C"))).toThrow(TypeError);
        expect(() => (graph.getRelations() as KnowledgeRelation[]).pop()).toThrow(TypeError);
        expect(() => (graph.getOutgoingRelations("A") as KnowledgeRelation[]).splice(0, 1)).toThrow(
            TypeError
        );
        expect(graph.getNodes()).toEqual([node("A"), node("B")]);
        expect(graph.getRelations()).toEqual([edge]);
    });

    it("reconstructs the same identity-only path from differently ordered inputs", () => {
        const nodes = [node("A"), node("B"), node("C")];
        const relations = [relation("R1", "A", "B"), relation("R2", "B", "C")];
        const forward = new KnowledgeGraph(nodes, relations);
        const reverse = new KnowledgeGraph([...nodes].reverse(), [...relations].reverse());

        expect(reconstructPath(forward)).toEqual(["A", "R1", "B", "R2", "C"]);
        expect(reconstructPath(reverse)).toEqual(reconstructPath(forward));
    });
});
