import { describe, expect, it } from "vitest";

import { KnowledgeNode } from "../../src/knowledge";

describe("KnowledgeNode", () => {
    it("creates an immutable generic node", () => {
        const node = new KnowledgeNode({ id: "concept:α", kind: "abstract concept", weight: -2.5 });

        expect(node).toEqual({ id: "concept:α", kind: "abstract concept", weight: -2.5 });
        expect(Object.isFrozen(node)).toBe(true);
    });

    it.each(["", " ", "\n\t", " node", "node ", "\tnode", "node\n"])(
        "rejects the invalid ID %j",
        (id) => {
            expect(() => new KnowledgeNode({ id, kind: "concept", weight: 1 })).toThrow(TypeError);
        }
    );

    it.each(["", " ", " concept", "concept "])("rejects the invalid kind %j", (kind) => {
        expect(() => new KnowledgeNode({ id: "node", kind, weight: 1 })).toThrow(TypeError);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the non-finite weight %s",
        (weight) => {
            expect(() => new KnowledgeNode({ id: "node", kind: "concept", weight })).toThrow(
                RangeError
            );
        }
    );
});
