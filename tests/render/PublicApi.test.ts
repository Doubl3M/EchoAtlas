import { describe, expect, it } from "vitest";

import type {
    ConnectionVisualStyle,
    ElevationBand,
    LabelVisualStyle,
    LabelProvider,
    LocationVisualStyle,
    RenderSurface,
    VisualTheme,
} from "../../src/render";

describe("render public API", () => {
    it("exports only intended runtime symbols", async () => {
        const publicApi = await import("../../src/render");

        expect(Object.keys(publicApi).sort()).toEqual([
            "CanvasRenderSurface",
            "CanvasRenderer",
            "SeventiesTheme",
        ]);
    });

    it("exports visual and surface contracts as types only", () => {
        const keys: readonly [
            keyof ElevationBand,
            keyof ConnectionVisualStyle,
            keyof LocationVisualStyle,
            keyof LabelVisualStyle,
            keyof VisualTheme,
            keyof RenderSurface,
            ReturnType<LabelProvider>,
        ] = ["maximum", "opacity", "radius", "minZoom", "terrainBands", "fillRect", undefined];

        expect(keys).toHaveLength(7);
    });
});
