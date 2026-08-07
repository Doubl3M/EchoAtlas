import { describe, expect, it } from "vitest";

import type { KnowledgeNodeOptions, KnowledgeRelationOptions } from "../../src/knowledge";

describe("knowledge public API", () => {
    it("exports only the intended runtime symbols", async () => {
        const publicApi = await import("../../src/knowledge");

        expect(Object.keys(publicApi).sort()).toEqual([
            "KnowledgeGraph",
            "KnowledgeNode",
            "KnowledgeRelation",
        ]);
    });

    it("exports construction options as types", () => {
        const node: KnowledgeNodeOptions = { id: "A", kind: "concept", weight: 1 };
        const relation: KnowledgeRelationOptions = {
            id: "R",
            sourceId: "A",
            targetId: "B",
            kind: "association",
            weight: 1,
        };

        expect(node.id).toBe("A");
        expect(relation.id).toBe("R");
    });
});
