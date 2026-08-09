import { describe, expect, it } from "vitest";

import {
    CameraJourney,
    easeInOutCubic,
    interpolateCameraJourney,
    planCameraArrival,
    planCameraJourney,
    type CameraJourneyScheduler,
} from "../../src/app/CameraJourney";
import { Camera2D, CameraConfig } from "../../src/engine/camera";

class ControlledScheduler implements CameraJourneyScheduler {
    private readonly callbacks = new Map<number, (timestamp: number) => void>();
    private nextHandle = 1;

    public request(callback: (timestamp: number) => void): number {
        const handle = this.nextHandle;
        this.nextHandle += 1;
        this.callbacks.set(handle, callback);
        return handle;
    }

    public cancel(handle: number): void {
        this.callbacks.delete(handle);
    }

    public step(timestamp: number): void {
        const entry = this.callbacks.entries().next().value as
            readonly [number, (timestamp: number) => void] | undefined;
        if (entry === undefined) {
            return;
        }
        this.callbacks.delete(entry[0]);
        entry[1](timestamp);
    }

    public get pendingCount(): number {
        return this.callbacks.size;
    }
}

function camera(): Camera2D {
    const value = new Camera2D(
        new CameraConfig({
            viewportWidth: 200,
            viewportHeight: 100,
            minZoom: 1,
            maxZoom: 40,
            initialZoom: 8,
        })
    );
    value.setPosition(-4, 6);
    return value;
}

function journey(
    value: Camera2D,
    scheduler: ControlledScheduler,
    render: () => void
): CameraJourney {
    return new CameraJourney({ camera: value, duration: 650, scheduler, render });
}

function arrival(x: number, y: number, zoom: number) {
    return { position: { x, y }, zoom };
}

describe("Camera journey", () => {
    it("plans the explicit arrival independently from the current Camera zoom", () => {
        const value = camera();

        expect(planCameraJourney(value, arrival(12, -3, 5))).toEqual({
            startPosition: { x: -4, y: 6 },
            targetPosition: { x: 12, y: -3 },
            startZoom: 8,
            targetZoom: 5,
        });
        expect(value.getPosition()).toEqual({ x: -4, y: 6 });
        expect(value.getZoom()).toBe(8);
    });

    it("frames center and all four World edges without avoidable off-World space", () => {
        const frame = (x: number, y: number) =>
            planCameraArrival({
                destination: { x, y },
                targetZoom: 10,
                worldWidth: 100,
                worldHeight: 60,
                viewportWidth: 200,
                viewportHeight: 100,
            });

        expect(frame(50, 30).position).toEqual({ x: 50, y: 30 });
        expect(frame(1, 30).position).toEqual({ x: 10, y: 30 });
        expect(frame(99, 30).position).toEqual({ x: 90, y: 30 });
        expect(frame(50, 1).position).toEqual({ x: 50, y: 5 });
        expect(frame(50, 59).position).toEqual({ x: 50, y: 55 });
    });

    it("uses the current reduced panel viewport when framing an edge destination", () => {
        const wide = planCameraArrival({
            destination: { x: 1, y: 30 },
            targetZoom: 10,
            worldWidth: 100,
            worldHeight: 60,
            viewportWidth: 200,
            viewportHeight: 100,
        });
        const reduced = planCameraArrival({
            destination: { x: 1, y: 30 },
            targetZoom: 10,
            worldWidth: 100,
            worldHeight: 60,
            viewportWidth: 100,
            viewportHeight: 100,
        });

        expect(wide.position.x).toBe(10);
        expect(reduced.position.x).toBe(5);
    });

    it("centers the World when the viewport exceeds it on an axis", () => {
        expect(
            planCameraArrival({
                destination: { x: 1, y: 30 },
                targetZoom: 10,
                worldWidth: 100,
                worldHeight: 60,
                viewportWidth: 1200,
                viewportHeight: 100,
            }).position
        ).toEqual({ x: 50, y: 30 });
    });

    it("interpolates deterministic start, midpoint and end states", () => {
        const plan = planCameraJourney(camera(), arrival(12, -2, 12));

        expect(interpolateCameraJourney(plan, 0)).toEqual({
            position: { x: -4, y: 6 },
            zoom: 8,
        });
        expect(interpolateCameraJourney(plan, easeInOutCubic(0.5))).toEqual({
            position: { x: 4, y: 2 },
            zoom: 10,
        });
        expect(interpolateCameraJourney(plan, 1)).toEqual({
            position: { x: 12, y: -2 },
            zoom: 12,
        });
    });

    it("animates to the exact destination through injected frames", () => {
        const value = camera();
        const scheduler = new ControlledScheduler();
        let renders = 0;
        const animation = journey(value, scheduler, () => {
            renders += 1;
        });

        animation.start(arrival(10, 20, 12), false);
        scheduler.step(1000);
        scheduler.step(1325);
        scheduler.step(1650);

        expect(value.getPosition()).toEqual({ x: 10, y: 20 });
        expect(value.getZoom()).toBe(12);
        expect(renders).toBe(3);
        expect(animation.isActive()).toBe(false);
    });

    it("cancels immediately without applying another frame", () => {
        const value = camera();
        const scheduler = new ControlledScheduler();
        const animation = journey(value, scheduler, () => undefined);

        animation.start(arrival(10, 20, 12), false);
        animation.cancel();
        scheduler.step(1000);

        expect(scheduler.pendingCount).toBe(0);
        expect(value.getPosition()).toEqual({ x: -4, y: 6 });
        expect(value.getZoom()).toBe(8);
    });

    it("replaces an active journey from the current Camera state", () => {
        const value = camera();
        const scheduler = new ControlledScheduler();
        const animation = journey(value, scheduler, () => undefined);

        animation.start(arrival(12, 6, 8), false);
        scheduler.step(0);
        scheduler.step(325);
        expect(value.getPosition()).toEqual({ x: 4, y: 6 });
        animation.start(arrival(20, -10, 16), false);
        scheduler.step(1000);
        scheduler.step(1650);

        expect(value.getPosition()).toEqual({ x: 20, y: -10 });
        expect(value.getZoom()).toBe(16);
    });

    it("applies the final state directly when reduced motion is requested", () => {
        const value = camera();
        const scheduler = new ControlledScheduler();
        let renders = 0;
        const animation = journey(value, scheduler, () => {
            renders += 1;
        });

        animation.start(arrival(3, 4, 10), true);

        expect(value.getPosition()).toEqual({ x: 3, y: 4 });
        expect(value.getZoom()).toBe(10);
        expect(renders).toBe(1);
        expect(scheduler.pendingCount).toBe(0);
    });

    it("rejects invalid duration, destination, zoom and progress", () => {
        const value = camera();
        const scheduler = new ControlledScheduler();

        expect(
            () =>
                new CameraJourney({
                    camera: value,
                    duration: 0,
                    scheduler,
                    render: () => undefined,
                })
        ).toThrow("duration");
        expect(() => planCameraJourney(value, arrival(Number.NaN, 0, 1))).toThrow("finite");
        expect(() => planCameraJourney(value, arrival(0, 0, -1))).toThrow("arrival zoom");
        expect(() =>
            interpolateCameraJourney(planCameraJourney(value, arrival(0, 0, 1)), 2)
        ).toThrow("progress");
    });
});
