import { Camera2D } from "../camera";

/** Browser-independent pointer-like pan and zoom commands for a Camera2D. */
export class CameraInteractionController {
    private readonly camera: Camera2D;
    private panX: number | undefined;
    private panY: number | undefined;

    public constructor(camera: Camera2D) {
        this.camera = camera;
    }

    public beginPan(screenX: number, screenY: number): void {
        CameraInteractionController.validateFinite(screenX, "screenX");
        CameraInteractionController.validateFinite(screenY, "screenY");
        this.panX = screenX;
        this.panY = screenY;
    }

    public movePan(screenX: number, screenY: number): void {
        CameraInteractionController.validateFinite(screenX, "screenX");
        CameraInteractionController.validateFinite(screenY, "screenY");
        if (this.panX === undefined || this.panY === undefined) {
            return;
        }

        const deltaX = screenX - this.panX;
        const deltaY = screenY - this.panY;
        CameraInteractionController.validateFinite(deltaX, "pan delta x");
        CameraInteractionController.validateFinite(deltaY, "pan delta y");
        const zoom = this.camera.getZoom();
        const worldDeltaX = -deltaX / zoom;
        const worldDeltaY = -deltaY / zoom;
        CameraInteractionController.validateFinite(worldDeltaX, "world pan delta x");
        CameraInteractionController.validateFinite(worldDeltaY, "world pan delta y");

        this.camera.pan(worldDeltaX, worldDeltaY);
        this.panX = screenX;
        this.panY = screenY;
    }

    public endPan(): void {
        this.panX = undefined;
        this.panY = undefined;
    }

    public cancelPan(): void {
        this.endPan();
    }

    public zoomAt(screenX: number, screenY: number, zoom: number): void {
        CameraInteractionController.validateFinite(screenX, "screenX");
        CameraInteractionController.validateFinite(screenY, "screenY");
        CameraInteractionController.validateFinite(zoom, "zoom");
        this.camera.zoomAt(screenX, screenY, zoom);
    }

    private static validateFinite(value: number, name: string): void {
        if (!Number.isFinite(value)) {
            throw new RangeError(`${name} must be finite.`);
        }
    }
}
