import { describe, expect, it } from "vitest";

import { WorldLocation } from "../../src/world";

describe("WorldLocation", () => {
    it("preserves a valid Knowledge Graph identity and is immutable", () => {
        const location = new WorldLocation(
            { knowledgeNodeId: "node:α", x: 2.5, y: 1.25, elevation: 0.75 },
            4,
            3
        );

        expect(location).toEqual({
            knowledgeNodeId: "node:α",
            x: 2.5,
            y: 1.25,
            elevation: 0.75,
        });
        expect(Object.isFrozen(location)).toBe(true);
    });

    it.each(["", " ", " node", "node "])("rejects the invalid node ID %j", (knowledgeNodeId) => {
        expect(
            () => new WorldLocation({ knowledgeNodeId, x: 0, y: 0, elevation: 0 }, 1, 1)
        ).toThrow(TypeError);
    });

    it.each([-1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects the out-of-bounds x coordinate %s",
        (x) => {
            expect(
                () => new WorldLocation({ knowledgeNodeId: "A", x, y: 0, elevation: 0 }, 2, 1)
            ).toThrow(RangeError);
        }
    );

    it.each([-1, 1.1, Number.NaN, Number.NEGATIVE_INFINITY])(
        "rejects the out-of-bounds y coordinate %s",
        (y) => {
            expect(
                () => new WorldLocation({ knowledgeNodeId: "A", x: 0, y, elevation: 0 }, 1, 2)
            ).toThrow(RangeError);
        }
    );

    it.each([-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects the invalid elevation %s",
        (elevation) => {
            expect(
                () => new WorldLocation({ knowledgeNodeId: "A", x: 0, y: 0, elevation }, 1, 1)
            ).toThrow(RangeError);
        }
    );

    it.each([0, -1, 1.5, Number.NaN])("rejects the invalid world width %s", (worldWidth) => {
        expect(
            () =>
                new WorldLocation({ knowledgeNodeId: "A", x: 0, y: 0, elevation: 0 }, worldWidth, 1)
        ).toThrow(RangeError);
    });

    it.each([0, -1, 1.5, Number.NaN])("rejects the invalid world height %s", (worldHeight) => {
        expect(
            () =>
                new WorldLocation(
                    { knowledgeNodeId: "A", x: 0, y: 0, elevation: 0 },
                    1,
                    worldHeight
                )
        ).toThrow(RangeError);
    });
});
