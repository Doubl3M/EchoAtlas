import type { Camera2D } from "../engine/camera";

export interface CurrentBroadcastLandmarkPosition {
    readonly x: number;
    readonly y: number;
}

export interface CurrentBroadcastLandmarkOptions {
    readonly position: CurrentBroadcastLandmarkPosition;
    readonly accessibleLabel: string;
    readonly visibleLabel: string;
    readonly onSelect: () => void;
}

export interface CurrentBroadcastLandmark {
    readonly element: HTMLButtonElement;
    update(camera: Camera2D): void;
}

const LANDMARK_X_RATIO = 0.74;
const LANDMARK_Y_RATIO = 0.18;

/** Stable application-presentation placement outside semantic World ownership. */
export function planCurrentBroadcastLandmark(
    worldWidth: number,
    worldHeight: number
): CurrentBroadcastLandmarkPosition {
    validateDimension(worldWidth, "width");
    validateDimension(worldHeight, "height");
    return Object.freeze({ x: worldWidth * LANDMARK_X_RATIO, y: worldHeight * LANDMARK_Y_RATIO });
}

/** Browser landmark projected through Camera while remaining independent from GeographicWorld. */
export function createCurrentBroadcastLandmark(
    options: CurrentBroadcastLandmarkOptions
): CurrentBroadcastLandmark {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "broadcast-landmark";
    element.setAttribute("aria-label", options.accessibleLabel);
    element.dataset.landmarkKind = "current-broadcast";
    element.dataset.worldX = String(options.position.x);
    element.dataset.worldY = String(options.position.y);
    const antenna = document.createElement("span");
    antenna.className = "broadcast-landmark__antenna";
    antenna.setAttribute("aria-hidden", "true");
    const tower = document.createElement("span");
    tower.className = "broadcast-landmark__tower";
    tower.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "broadcast-landmark__label";
    label.textContent = options.visibleLabel;
    element.append(antenna, tower, label);
    element.addEventListener("click", options.onSelect);
    return Object.freeze({
        element,
        update(camera: Camera2D): void {
            const screen = camera.worldToScreen(options.position.x, options.position.y);
            element.style.left = `${screen.x}px`;
            element.style.top = `${screen.y}px`;
        },
    });
}

function validateDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(
            `Current broadcast landmark World ${name} must be finite and positive.`
        );
    }
}
