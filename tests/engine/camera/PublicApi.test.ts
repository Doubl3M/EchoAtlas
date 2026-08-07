import { describe, expect, it } from "vitest";

import type { CameraConfigOptions, CameraPoint } from "../../../src/engine/camera";

describe("camera public API", () => {
    it("exports only the intended runtime symbols", async () => {
        const publicApi = await import("../../../src/engine/camera");

        expect(Object.keys(publicApi).sort()).toEqual(["Camera2D", "CameraConfig"]);
    });

    it("exports data contracts as types only", () => {
        const point: CameraPoint = { x: 1, y: 2 };
        const configKey: keyof CameraConfigOptions = "viewportWidth";

        expect(point).toEqual({ x: 1, y: 2 });
        expect(configKey).toBe("viewportWidth");
    });
});
