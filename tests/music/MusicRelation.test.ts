import { describe, expect, it } from "vitest";

import { MusicRelation } from "../../src/music";

describe("MusicRelation", () => {
    it("preserves an immutable directed musical relation", () => {
        const relation = new MusicRelation({
            id: "performed",
            sourceKind: "artist",
            sourceId: "artist-a",
            targetKind: "album",
            targetId: "album-b",
            kind: "performed",
            weight: 2.5,
        });

        expect(relation).toEqual({
            id: "performed",
            sourceKind: "artist",
            sourceId: "artist-a",
            targetKind: "album",
            targetId: "album-b",
            kind: "performed",
            weight: 2.5,
        });
        expect(Object.isFrozen(relation)).toBe(true);
    });

    it("uses the neutral structural weight by default", () => {
        const relation = new MusicRelation({
            id: "self",
            sourceKind: "artist",
            sourceId: "a",
            targetKind: "artist",
            targetId: "a",
            kind: "influences",
        });

        expect(relation.weight).toBe(1);
    });

    it.each([0, -3.25])("preserves the finite weight %s without normalization", (weight) => {
        const relation = new MusicRelation({
            id: "weighted",
            sourceKind: "artist",
            sourceId: "a",
            targetKind: "album",
            targetId: "b",
            kind: "performed",
            weight,
        });

        expect(relation.weight).toBe(weight);
    });

    it.each([
        ["id", { id: "" }],
        ["source ID", { sourceId: " source" }],
        ["target ID", { targetId: "target " }],
        ["kind", { kind: " " }],
    ] as const)("rejects an invalid %s", (_name, override) => {
        expect(
            () =>
                new MusicRelation({
                    id: "relation",
                    sourceKind: "artist",
                    sourceId: "source",
                    targetKind: "album",
                    targetId: "target",
                    kind: "performed",
                    ...override,
                })
        ).toThrow(TypeError);
    });

    it.each(["sourceKind", "targetKind"] as const)("rejects an invalid %s", (endpoint) => {
        expect(
            () =>
                new MusicRelation({
                    id: "relation",
                    sourceKind: "artist",
                    sourceId: "source",
                    targetKind: "album",
                    targetId: "target",
                    kind: "performed",
                    [endpoint]: "city",
                } as never)
        ).toThrow(TypeError);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects non-finite weights",
        (weight) => {
            expect(
                () =>
                    new MusicRelation({
                        id: "relation",
                        sourceKind: "artist",
                        sourceId: "source",
                        targetKind: "album",
                        targetId: "target",
                        kind: "performed",
                        weight,
                    })
            ).toThrow(RangeError);
        }
    );
});
