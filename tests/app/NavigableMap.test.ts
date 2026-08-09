import { describe, expect, it } from "vitest";

import { findLocationAtScreen } from "../../src/app/NavigableMap";
import { Camera2D, CameraConfig } from "../../src/engine/camera";
import { HeightField } from "../../src/engine/terrain";
import { GeographicWorld, WorldLocation } from "../../src/world";

function fixture(): { world: GeographicWorld; camera: Camera2D } {
    const world = new GeographicWorld({
        width: 20,
        height: 20,
        heightField: new HeightField(1, 1, [0.5]),
        locations: [
            new WorldLocation({ knowledgeNodeId: "A", x: 4, y: 5, elevation: 0.5 }, 20, 20),
            new WorldLocation({ knowledgeNodeId: "B", x: 15, y: 14, elevation: 0.5 }, 20, 20),
        ],
        connections: [],
    });
    const camera = new Camera2D(
        new CameraConfig({
            viewportWidth: 200,
            viewportHeight: 200,
            minZoom: 1,
            maxZoom: 20,
            initialZoom: 5,
        })
    );
    camera.setPosition(10, 10);
    return { world, camera };
}

describe("navigable map location hit testing", () => {
    it("selects a marker through Camera screen-to-world conversion", () => {
        const { world, camera } = fixture();
        const marker = camera.worldToScreen(4, 5);

        expect(
            findLocationAtScreen(world, camera, marker.x + 8, marker.y, 11, new Set(["A"]))
                ?.knowledgeNodeId
        ).toBe("A");
    });

    it("respects zoom and rejects clicks outside the marker hit radius", () => {
        const { world, camera } = fixture();
        camera.setZoom(12);
        const marker = camera.worldToScreen(15, 14);

        expect(
            findLocationAtScreen(world, camera, marker.x, marker.y, 11, new Set(["B"]))
                ?.knowledgeNodeId
        ).toBe("B");
        expect(
            findLocationAtScreen(world, camera, marker.x + 20, marker.y, 11, new Set(["B"]))
        ).toBeUndefined();
    });

    it("never selects a location excluded from the current render plan", () => {
        const { world, camera } = fixture();
        const hiddenMarker = camera.worldToScreen(4, 5);

        expect(
            findLocationAtScreen(world, camera, hiddenMarker.x, hiddenMarker.y, 11, new Set(["B"]))
        ).toBeUndefined();
    });

    it("uses a larger presentation-specific hit radius for a visible city", () => {
        const { world, camera } = fixture();
        const marker = camera.worldToScreen(4, 5);

        expect(
            findLocationAtScreen(
                world,
                camera,
                marker.x + 16,
                marker.y,
                (id) => (id === "A" ? 18 : 11),
                new Set(["A"])
            )?.knowledgeNodeId
        ).toBe("A");
    });
});
