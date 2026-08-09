import type { Camera2D, CameraPoint } from "../engine/camera";

export interface CameraJourneyPlan {
    readonly startPosition: CameraPoint;
    readonly targetPosition: CameraPoint;
    readonly startZoom: number;
    readonly targetZoom: number;
}

export interface CameraJourneyState {
    readonly position: CameraPoint;
    readonly zoom: number;
}

export interface CameraJourneyScheduler {
    request(callback: (timestamp: number) => void): number;
    cancel(handle: number): void;
}

export interface CameraJourneyOptions {
    readonly camera: Camera2D;
    readonly duration: number;
    readonly scheduler: CameraJourneyScheduler;
    readonly render: () => void;
}

export interface CameraArrivalOptions {
    readonly destination: CameraPoint;
    readonly targetZoom: number;
    readonly worldWidth: number;
    readonly worldHeight: number;
    readonly viewportWidth: number;
    readonly viewportHeight: number;
}

/** Pure arrival framing that favors surrounding World terrain over naive centering at an edge. */
export function planCameraArrival(options: CameraArrivalOptions): CameraJourneyState {
    validatePoint(options.destination);
    validatePositiveFinite(options.targetZoom, "targetZoom");
    validatePositiveFinite(options.worldWidth, "worldWidth");
    validatePositiveFinite(options.worldHeight, "worldHeight");
    validatePositiveFinite(options.viewportWidth, "viewportWidth");
    validatePositiveFinite(options.viewportHeight, "viewportHeight");
    return Object.freeze({
        position: point(
            safeAxisCenter(
                options.destination.x,
                options.worldWidth,
                options.viewportWidth / options.targetZoom
            ),
            safeAxisCenter(
                options.destination.y,
                options.worldHeight,
                options.viewportHeight / options.targetZoom
            )
        ),
        zoom: options.targetZoom,
    });
}

export function planCameraJourney(
    camera: Camera2D,
    arrival: CameraJourneyState
): CameraJourneyPlan {
    validatePoint(arrival.position);
    validatePositiveFinite(arrival.zoom, "arrival zoom");
    return Object.freeze({
        startPosition: camera.getPosition(),
        targetPosition: point(arrival.position.x, arrival.position.y),
        startZoom: camera.getZoom(),
        targetZoom: arrival.zoom,
    });
}

export function interpolateCameraJourney(
    plan: CameraJourneyPlan,
    progress: number
): CameraJourneyState {
    if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
        throw new RangeError("Camera journey progress must be finite and in [0, 1].");
    }
    return Object.freeze({
        position: point(
            interpolate(plan.startPosition.x, plan.targetPosition.x, progress),
            interpolate(plan.startPosition.y, plan.targetPosition.y, progress)
        ),
        zoom: interpolate(plan.startZoom, plan.targetZoom, progress),
    });
}

export function easeInOutCubic(progress: number): number {
    if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
        throw new RangeError("Camera journey progress must be finite and in [0, 1].");
    }
    return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

/** Browser-orchestrated Camera animation with explicit cancellation and replace semantics. */
export class CameraJourney {
    private readonly camera: Camera2D;
    private readonly duration: number;
    private readonly scheduler: CameraJourneyScheduler;
    private readonly render: () => void;
    private frameHandle: number | undefined;

    public constructor(options: CameraJourneyOptions) {
        validatePositiveFinite(options.duration, "duration");
        this.camera = options.camera;
        this.duration = options.duration;
        this.scheduler = options.scheduler;
        this.render = options.render;
    }

    public start(arrival: CameraJourneyState, reducedMotion: boolean): void {
        this.cancel();
        const plan = planCameraJourney(this.camera, arrival);
        if (reducedMotion) {
            this.apply(interpolateCameraJourney(plan, 1));
            return;
        }
        let startTime: number | undefined;
        const frame = (timestamp: number): void => {
            startTime ??= timestamp;
            const progress = Math.min(1, (timestamp - startTime) / this.duration);
            this.apply(interpolateCameraJourney(plan, easeInOutCubic(progress)));
            if (progress < 1) {
                this.frameHandle = this.scheduler.request(frame);
            } else {
                this.frameHandle = undefined;
            }
        };
        this.frameHandle = this.scheduler.request(frame);
    }

    public cancel(): void {
        if (this.frameHandle !== undefined) {
            this.scheduler.cancel(this.frameHandle);
            this.frameHandle = undefined;
        }
    }

    public isActive(): boolean {
        return this.frameHandle !== undefined;
    }

    private apply(state: CameraJourneyState): void {
        this.camera.setPosition(state.position.x, state.position.y);
        this.camera.setZoom(state.zoom);
        this.render();
    }
}

function interpolate(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
}

function point(x: number, y: number): CameraPoint {
    return Object.freeze({ x, y });
}

function validatePoint(value: CameraPoint): void {
    if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
        throw new RangeError("Camera journey target position must be finite.");
    }
}

function safeAxisCenter(destination: number, worldSize: number, visibleSize: number): number {
    if (visibleSize >= worldSize) {
        return worldSize / 2;
    }
    const halfVisibleSize = visibleSize / 2;
    return Math.min(worldSize - halfVisibleSize, Math.max(halfVisibleSize, destination));
}

function validatePositiveFinite(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(`${name} must be finite and greater than zero.`);
    }
}
