import { describe, expect, it } from "vitest";

import { WorldConnection } from "../../src/world";

describe("WorldConnection", () => {
    it("preserves directed Knowledge Graph identities and is immutable", () => {
        const connection = new WorldConnection({
            knowledgeRelationId: "relation:α",
            sourceKnowledgeNodeId: "node:A",
            targetKnowledgeNodeId: "node:B",
        });

        expect(connection).toEqual({
            knowledgeRelationId: "relation:α",
            sourceKnowledgeNodeId: "node:A",
            targetKnowledgeNodeId: "node:B",
        });
        expect(Object.isFrozen(connection)).toBe(true);
    });

    it.each([
        ["relation ID", { knowledgeRelationId: "" }],
        ["source ID", { sourceKnowledgeNodeId: " source" }],
        ["target ID", { targetKnowledgeNodeId: "target " }],
    ] as const)("rejects an invalid %s", (_name, override) => {
        expect(
            () =>
                new WorldConnection({
                    knowledgeRelationId: "R",
                    sourceKnowledgeNodeId: "A",
                    targetKnowledgeNodeId: "B",
                    ...override,
                })
        ).toThrow(TypeError);
    });
});
