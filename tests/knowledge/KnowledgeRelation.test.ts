import { describe, expect, it } from "vitest";

import { KnowledgeRelation } from "../../src/knowledge";

describe("KnowledgeRelation", () => {
    it("creates an immutable directed relation", () => {
        const relation = new KnowledgeRelation({
            id: "relation:α",
            sourceId: "source",
            targetId: "target",
            kind: "semantic association",
            weight: 4.25,
        });

        expect(relation).toEqual({
            id: "relation:α",
            sourceId: "source",
            targetId: "target",
            kind: "semantic association",
            weight: 4.25,
        });
        expect(Object.isFrozen(relation)).toBe(true);
    });

    it.each([
        ["id", { id: "" }],
        ["source", { sourceId: " " }],
        ["target", { targetId: "\n" }],
        ["kind", { kind: "" }],
        ["leading ID whitespace", { id: " relation" }],
        ["trailing source whitespace", { sourceId: "source " }],
        ["leading target whitespace", { targetId: "\ttarget" }],
        ["trailing kind whitespace", { kind: "association\n" }],
    ] as const)("rejects an invalid %s", (_name, override) => {
        expect(
            () =>
                new KnowledgeRelation({
                    id: "relation",
                    sourceId: "source",
                    targetId: "target",
                    kind: "association",
                    weight: 1,
                    ...override,
                })
        ).toThrow(TypeError);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the non-finite weight %s",
        (weight) => {
            expect(
                () =>
                    new KnowledgeRelation({
                        id: "relation",
                        sourceId: "source",
                        targetId: "target",
                        kind: "association",
                        weight,
                    })
            ).toThrow(RangeError);
        }
    );
});
