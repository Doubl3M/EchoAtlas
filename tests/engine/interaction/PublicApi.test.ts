import { describe, expect, it } from "vitest";

import * as interactionApi from "../../../src/engine/interaction";

describe("interaction public API", () => {
    it("exports only the generic camera interaction controller at runtime", () => {
        expect(Object.keys(interactionApi).sort()).toEqual(["CameraInteractionController"]);
    });
});
