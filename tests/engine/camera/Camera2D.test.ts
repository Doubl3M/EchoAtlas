import { describe, expect, it } from "vitest";

import { Camera2D, CameraConfig } from "../../../src/engine/camera";

const ROUND_TRIP_PRECISION_DIGITS = 9;

function camera(overrides: { readonly width?: number; readonly height?: number } = {}): Camera2D {
    return new Camera2D(
        new CameraConfig({
            viewportWidth: overrides.width ?? 800,
            viewportHeight: overrides.height ?? 600,
            minZoom: 0.5,
            maxZoom: 4,
            initialZoom: 2,
        })
    );
}

describe("Camera2D", () => {
    it("starts at the world origin with the configured zoom", () => {
        const value = camera();

        expect(value.getPosition()).toEqual({ x: 0, y: 0 });
        expect(value.getZoom()).toBe(2);
    });

    it("sets finite positive and negative positions", () => {
        const value = camera();

        value.setPosition(-12.5, 45.25);

        expect(value.getPosition()).toEqual({ x: -12.5, y: 45.25 });
    });

    it("pans deterministically in both directions", () => {
        const value = camera();
        value.setPosition(10, -5);

        value.pan(4.5, -3);
        value.pan(-2, 7.5);

        expect(value.getPosition()).toEqual({ x: 12.5, y: -0.5 });
    });

    it("sets and clamps zoom at both configured bounds", () => {
        const value = camera();

        value.setZoom(3);
        expect(value.getZoom()).toBe(3);
        value.setZoom(0.1);
        expect(value.getZoom()).toBe(0.5);
        value.setZoom(10);
        expect(value.getZoom()).toBe(4);
        value.setZoom(0.5);
        expect(value.getZoom()).toBe(0.5);
        value.setZoom(4);
        expect(value.getZoom()).toBe(4);
    });

    it("maps the camera position to the exact viewport center", () => {
        const value = camera();
        value.setPosition(10, -20);

        expect(value.worldToScreen(10, -20)).toEqual({ x: 400, y: 300 });
        expect(value.screenToWorld(400, 300)).toEqual({ x: 10, y: -20 });
    });

    it("keeps exact reference transformations at the center, corners, and outside", () => {
        const value = camera();
        value.setPosition(10, -20);

        expect(value.worldToScreen(13, -16)).toEqual({ x: 406, y: 308 });
        expect(value.screenToWorld(0, 0)).toEqual({ x: -190, y: -170 });
        expect(value.screenToWorld(800, 600)).toEqual({ x: 210, y: 130 });
        expect(value.worldToScreen(-240, 180)).toEqual({ x: -100, y: 700 });
        expect(value.screenToWorld(-100, 700)).toEqual({ x: -240, y: 180 });
    });

    it("uses positive x to the right and positive y downward", () => {
        const value = camera();

        expect(value.worldToScreen(1, 1)).toEqual({ x: 402, y: 302 });
        expect(value.worldToScreen(-1, -1)).toEqual({ x: 398, y: 298 });
    });

    it.each([
        [-123.456, 789.012],
        [0, 0],
        [1_000_000_000_000, -1_000_000_000_000],
    ])("round-trips world coordinates (%s, %s)", (x, y) => {
        const value = camera();
        value.setPosition(-50.25, 75.5);
        value.setZoom(3.25);
        const screen = value.worldToScreen(x, y);
        const world = value.screenToWorld(screen.x, screen.y);

        expect(world.x).toBeCloseTo(x, ROUND_TRIP_PRECISION_DIGITS);
        expect(world.y).toBeCloseTo(y, ROUND_TRIP_PRECISION_DIGITS);
    });

    it.each([
        [-250.5, 900.25],
        [0, 0],
        [800, 600],
    ])("round-trips screen coordinates (%s, %s)", (x, y) => {
        const value = camera();
        value.setPosition(125, -250);
        value.setZoom(0.75);
        const world = value.screenToWorld(x, y);
        const screen = value.worldToScreen(world.x, world.y);

        expect(screen.x).toBeCloseTo(x, ROUND_TRIP_PRECISION_DIGITS);
        expect(screen.y).toBeCloseTo(y, ROUND_TRIP_PRECISION_DIGITS);
    });

    it("round-trips with a fractional viewport, negative position, and fractional zoom", () => {
        const value = camera({ width: 801.5, height: 599.25 });
        value.setPosition(-1_000_000.125, -2_000_000.875);
        value.setZoom(0.75);
        const worldInput = { x: 999_999_999_999.5, y: -888_888_888_888.25 };
        const screenInput = { x: -12_345.625, y: 98_765.375 };
        const worldRoundTrip = value.screenToWorld(
            value.worldToScreen(worldInput.x, worldInput.y).x,
            value.worldToScreen(worldInput.x, worldInput.y).y
        );
        const screenRoundTrip = value.worldToScreen(
            value.screenToWorld(screenInput.x, screenInput.y).x,
            value.screenToWorld(screenInput.x, screenInput.y).y
        );

        expect(worldRoundTrip.x).toBeCloseTo(worldInput.x, ROUND_TRIP_PRECISION_DIGITS);
        expect(worldRoundTrip.y).toBeCloseTo(worldInput.y, ROUND_TRIP_PRECISION_DIGITS);
        expect(screenRoundTrip.x).toBeCloseTo(screenInput.x, ROUND_TRIP_PRECISION_DIGITS);
        expect(screenRoundTrip.y).toBeCloseTo(screenInput.y, ROUND_TRIP_PRECISION_DIGITS);
    });

    it("zooms around the center without changing the camera position", () => {
        const value = camera();
        value.setPosition(10, -20);

        value.zoomAt(400, 300, 4);

        expect(value.getPosition()).toEqual({ x: 10, y: -20 });
        expect(value.getZoom()).toBe(4);
    });

    it("keeps the same world point under an arbitrary zoom anchor", () => {
        const value = camera();
        value.setPosition(10, -20);
        const before = value.screenToWorld(600, 450);

        value.zoomAt(600, 450, 4);

        expect(before).toEqual({ x: 110, y: 55 });
        expect(value.getPosition()).toEqual({ x: 60, y: 17.5 });
        expect(value.screenToWorld(600, 450)).toEqual(before);
    });

    it("clamps zoomAt while preserving its world anchor", () => {
        const value = camera();
        const before = value.screenToWorld(100, 200);

        value.zoomAt(100, 200, 100);

        expect(value.getZoom()).toBe(4);
        expect(value.screenToWorld(100, 200)).toEqual(before);
    });

    it("clamps zoomAt to the minimum while preserving its world anchor", () => {
        const value = camera();
        const before = value.screenToWorld(700, -100);

        value.zoomAt(700, -100, 0.01);

        expect(value.getZoom()).toBe(0.5);
        expect(value.screenToWorld(700, -100)).toEqual(before);
    });

    it("resizes the viewport without changing position or zoom", () => {
        const value = camera();
        value.setPosition(25, -30);
        value.setZoom(3);

        value.setViewport(1_024, 768);

        expect(value.getPosition()).toEqual({ x: 25, y: -30 });
        expect(value.getZoom()).toBe(3);
        expect(value.worldToScreen(25, -30)).toEqual({ x: 512, y: 384 });
    });

    it("supports a 1 × 1 viewport", () => {
        const value = camera({ width: 1, height: 1 });

        expect(value.worldToScreen(0, 0)).toEqual({ x: 0.5, y: 0.5 });
        expect(value.screenToWorld(0.5, 0.5)).toEqual({ x: 0, y: 0 });
        expect(value.screenToWorld(0, 0)).toEqual({ x: -0.25, y: -0.25 });
        const outside = { x: -250.25, y: 400.75 };
        const world = value.screenToWorld(outside.x, outside.y);
        const roundTrip = value.worldToScreen(world.x, world.y);
        expect(roundTrip.x).toBeCloseTo(outside.x, ROUND_TRIP_PRECISION_DIGITS);
        expect(roundTrip.y).toBeCloseTo(outside.y, ROUND_TRIP_PRECISION_DIGITS);
    });

    it("returns isolated immutable points", () => {
        const value = camera();
        const first = value.getPosition();
        const second = value.getPosition();
        const transformed = value.worldToScreen(0, 0);
        const inverse = value.screenToWorld(0, 0);
        const secondTransformed = value.worldToScreen(0, 0);

        expect(first).not.toBe(second);
        expect(Object.isFrozen(first)).toBe(true);
        expect(Object.isFrozen(transformed)).toBe(true);
        expect(Object.isFrozen(inverse)).toBe(true);
        expect(transformed).not.toBe(secondTransformed);
        expect(() => Object.assign(first as { x: number }, { x: 10 })).toThrow(TypeError);
        expect(value.getPosition()).toEqual({ x: 0, y: 0 });
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects non-finite position components %s",
        (invalid) => {
            const value = camera();
            expect(() => value.setPosition(invalid, 0)).toThrow(RangeError);
            expect(() => value.setPosition(0, invalid)).toThrow(RangeError);
        }
    );

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects non-finite pan components %s",
        (invalid) => {
            const value = camera();
            expect(() => value.pan(invalid, 0)).toThrow(RangeError);
            expect(() => value.pan(0, invalid)).toThrow(RangeError);
        }
    );

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the non-finite zoom %s",
        (invalid) => {
            const value = camera();
            expect(() => value.setZoom(invalid)).toThrow(RangeError);
            expect(() => value.zoomAt(0, 0, invalid)).toThrow(RangeError);
        }
    );

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects non-finite transform inputs %s",
        (invalid) => {
            const value = camera();
            expect(() => value.worldToScreen(invalid, 0)).toThrow(RangeError);
            expect(() => value.worldToScreen(0, invalid)).toThrow(RangeError);
            expect(() => value.screenToWorld(invalid, 0)).toThrow(RangeError);
            expect(() => value.screenToWorld(0, invalid)).toThrow(RangeError);
            expect(() => value.zoomAt(invalid, 0, 1)).toThrow(RangeError);
            expect(() => value.zoomAt(0, invalid, 1)).toThrow(RangeError);
        }
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid viewport dimension %s",
        (invalid) => {
            const value = camera();
            expect(() => value.setViewport(invalid, 100)).toThrow(RangeError);
            expect(() => value.setViewport(100, invalid)).toThrow(RangeError);
        }
    );

    it("rejects arithmetic overflow without partially mutating state", () => {
        const value = camera();
        value.setPosition(Number.MAX_VALUE, Number.MAX_VALUE);
        const before = value.getPosition();

        expect(() => value.pan(Number.MAX_VALUE, 0)).toThrow(RangeError);
        expect(value.getPosition()).toEqual(before);
        expect(() => value.worldToScreen(-Number.MAX_VALUE, 0)).toThrow(RangeError);
        expect(() => value.screenToWorld(Number.MAX_VALUE, 0)).toThrow(RangeError);
    });

    it("keeps state unchanged when any stateful operation fails", () => {
        const value = camera();
        value.setPosition(Number.MAX_VALUE, -20);
        value.setZoom(3);
        value.setViewport(640, 480);
        const position = value.getPosition();
        const zoom = value.getZoom();
        const center = value.worldToScreen(position.x, position.y);

        expect(() => value.setPosition(100, Number.NaN)).toThrow(RangeError);
        expect(() => value.setZoom(Number.NaN)).toThrow(RangeError);
        expect(() => value.pan(Number.MAX_VALUE, Number.MAX_VALUE)).toThrow(RangeError);
        expect(() => value.zoomAt(0, Number.POSITIVE_INFINITY, 2)).toThrow(RangeError);
        expect(() => value.setViewport(320, 0)).toThrow(RangeError);
        expect(value.getPosition()).toEqual(position);
        expect(value.getZoom()).toBe(zoom);
        expect(value.worldToScreen(position.x, position.y)).toEqual(center);
    });

    it("rejects zoomAt intermediate and final overflow without changing state", () => {
        const intermediate = camera();
        intermediate.setPosition(Number.MAX_VALUE, 0);
        const intermediatePosition = intermediate.getPosition();
        const intermediateZoom = intermediate.getZoom();
        expect(() => intermediate.zoomAt(Number.MAX_VALUE, 0, 1)).toThrow(RangeError);
        expect(intermediate.getPosition()).toEqual(intermediatePosition);
        expect(intermediate.getZoom()).toBe(intermediateZoom);

        const final = camera();
        final.setZoom(4);
        const finalPosition = final.getPosition();
        const finalZoom = final.getZoom();
        expect(() => final.zoomAt(Number.MAX_VALUE, 0, 0.5)).toThrow(RangeError);
        expect(final.getPosition()).toEqual(finalPosition);
        expect(final.getZoom()).toBe(finalZoom);
    });
});
