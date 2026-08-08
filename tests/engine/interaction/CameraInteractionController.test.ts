import { describe, expect, it } from "vitest";

import { Camera2D, CameraConfig } from "../../../src/engine/camera";
import { CameraInteractionController } from "../../../src/engine/interaction";

function createCamera(zoom = 1): Camera2D {
    return new Camera2D(
        new CameraConfig({
            viewportWidth: 200,
            viewportHeight: 100,
            minZoom: 0.5,
            maxZoom: 4,
            initialZoom: zoom,
        })
    );
}

describe("CameraInteractionController", () => {
    it("starts a pan and follows the grabbed map at zoom one", () => {
        const camera = createCamera();
        const interaction = new CameraInteractionController(camera);

        interaction.beginPan(10, 20);
        interaction.movePan(25, 12);

        expect(camera.getPosition()).toEqual({ x: -15, y: 8 });
    });

    it("ignores movement while no pan is active", () => {
        const camera = createCamera();
        new CameraInteractionController(camera).movePan(50, 60);
        expect(camera.getPosition()).toEqual({ x: 0, y: 0 });
    });

    it("converts screen movement through the current zoom", () => {
        const camera = createCamera(2);
        const interaction = new CameraInteractionController(camera);
        interaction.beginPan(-10, -20);
        interaction.movePan(10, 30);
        expect(camera.getPosition()).toEqual({ x: -10, y: -25 });
    });

    it("supports repeated positive and negative movements", () => {
        const camera = createCamera();
        const interaction = new CameraInteractionController(camera);
        interaction.beginPan(0, 0);
        interaction.movePan(10, -5);
        interaction.movePan(-4, 7);
        expect(camera.getPosition()).toEqual({ x: 4, y: -7 });
    });

    it.each(["endPan", "cancelPan"] as const)("%s stops the active pan", (operation) => {
        const camera = createCamera();
        const interaction = new CameraInteractionController(camera);
        interaction.beginPan(0, 0);
        interaction[operation]();
        interaction[operation]();
        interaction.movePan(20, 20);
        expect(camera.getPosition()).toEqual({ x: 0, y: 0 });
    });

    it("restarts an active pan from the latest explicit beginning", () => {
        const camera = createCamera();
        const interaction = new CameraInteractionController(camera);
        interaction.beginPan(0, 0);
        interaction.beginPan(100, 100);
        interaction.movePan(110, 120);
        expect(camera.getPosition()).toEqual({ x: -10, y: -20 });
    });

    it("zooms at a screen position and preserves the world point", () => {
        const camera = createCamera();
        const interaction = new CameraInteractionController(camera);
        const before = camera.screenToWorld(150, 25);
        interaction.zoomAt(150, 25, 3);
        expect(camera.screenToWorld(150, 25)).toEqual(before);
        expect(camera.getZoom()).toBe(3);
    });

    it("delegates zoom bounds to Camera2D", () => {
        const camera = createCamera();
        const interaction = new CameraInteractionController(camera);
        interaction.zoomAt(100, 50, 100);
        expect(camera.getZoom()).toBe(4);
        interaction.zoomAt(100, 50, 0.01);
        expect(camera.getZoom()).toBe(0.5);
    });

    it.each([Number.NaN, Infinity, -Infinity])("rejects non-finite arguments: %s", (invalid) => {
        const camera = createCamera();
        const interaction = new CameraInteractionController(camera);
        expect(() => interaction.beginPan(invalid, 0)).toThrow(RangeError);
        expect(() => interaction.movePan(0, invalid)).toThrow(RangeError);
        expect(() => interaction.zoomAt(0, 0, invalid)).toThrow(RangeError);
        expect(camera.getPosition()).toEqual({ x: 0, y: 0 });
        expect(camera.getZoom()).toBe(1);
    });

    it("keeps both camera and pan anchor coherent when a movement overflows", () => {
        const camera = createCamera();
        camera.setPosition(Number.MAX_VALUE, 0);
        const interaction = new CameraInteractionController(camera);
        interaction.beginPan(Number.MAX_VALUE, 0);

        expect(() => interaction.movePan(-Number.MAX_VALUE, 0)).toThrow(RangeError);
        expect(camera.getPosition()).toEqual({ x: Number.MAX_VALUE, y: 0 });
        camera.setPosition(0, 0);
        interaction.movePan(0, 0);
        expect(camera.getPosition().x).toBe(Number.MAX_VALUE);
    });
});
