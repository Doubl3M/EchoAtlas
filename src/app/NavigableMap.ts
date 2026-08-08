import { Camera2D, CameraConfig } from "../engine/camera";
import { CameraInteractionController } from "../engine/interaction";
import { TerrainConfig } from "../engine/terrain";
import { CanvasRenderer, CanvasRenderSurface, SeventiesTheme } from "../render";
import { WorldConfig } from "../world";

import { demoMusicDocumentJson } from "./demoMusicDocument";
import { createMusicAtlasSnapshot } from "./MusicAtlasPipeline";
import { uiText } from "./UiText";

const WORLD_WIDTH = 36;
const WORLD_HEIGHT = 24;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

/** Browser adapter that binds DOM events to the generic interaction controller. */
export function mountNavigableMap(root: HTMLElement): () => void {
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const worldConfig = createWorldConfig();
    const snapshot = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig);
    const camera = createCamera(viewportWidth, viewportHeight);
    const interaction = new CameraInteractionController(camera);
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", uiText.canvasLabel);
    const surface = new CanvasRenderSurface(canvas);
    const renderer = new CanvasRenderer(new SeventiesTheme(), snapshot.labels);
    const overlay = createOverlay();
    root.replaceChildren(canvas, overlay);

    const render = (): void => renderer.render(snapshot.world, camera, surface);
    const resize = (): void => {
        const width = Math.max(1, window.innerWidth);
        const height = Math.max(1, window.innerHeight);
        surface.resize(width, height, Math.max(1, window.devicePixelRatio));
        camera.setViewport(width, height);
        render();
    };
    const removePointerInteractions = bindPointerInteractions(canvas, interaction, render);
    const removeWheelInteraction = bindWheelInteraction(canvas, camera, interaction, render);
    window.addEventListener("resize", resize);
    resize();

    return (): void => {
        removePointerInteractions();
        removeWheelInteraction();
        window.removeEventListener("resize", resize);
    };
}

function createWorldConfig(): WorldConfig {
    const terrain = new TerrainConfig({
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        baseFrequency: 0.09,
        octaves: 4,
        persistence: 0.55,
        lacunarity: 2,
        offsetX: -8,
        offsetY: -5,
    });
    return new WorldConfig({
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        placementIterations: 24,
        attractionStrength: 0.025,
        repulsionStrength: 0.35,
        terrain,
    });
}

function createCamera(viewportWidth: number, viewportHeight: number): Camera2D {
    const fittedZoom = Math.min(viewportWidth / WORLD_WIDTH, viewportHeight / WORLD_HEIGHT) * 0.88;
    const camera = new Camera2D(
        new CameraConfig({
            viewportWidth,
            viewportHeight,
            minZoom: 0.25,
            maxZoom: 128,
            initialZoom: Math.min(128, Math.max(0.25, fittedZoom)),
        })
    );
    camera.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    return camera;
}

function bindPointerInteractions(
    canvas: HTMLCanvasElement,
    interaction: CameraInteractionController,
    render: () => void
): () => void {
    const pointerDown = (event: PointerEvent): void => {
        canvas.setPointerCapture(event.pointerId);
        interaction.beginPan(event.clientX, event.clientY);
    };
    const pointerMove = (event: PointerEvent): void => {
        if (!canvas.hasPointerCapture(event.pointerId)) {
            return;
        }
        interaction.movePan(event.clientX, event.clientY);
        render();
    };
    const pointerUp = (event: PointerEvent): void => {
        interaction.endPan();
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    };
    const pointerCancel = (event: PointerEvent): void => {
        interaction.cancelPan();
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    };

    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerCancel);

    return (): void => {
        canvas.removeEventListener("pointerdown", pointerDown);
        canvas.removeEventListener("pointermove", pointerMove);
        canvas.removeEventListener("pointerup", pointerUp);
        canvas.removeEventListener("pointercancel", pointerCancel);
    };
}

function bindWheelInteraction(
    canvas: HTMLCanvasElement,
    camera: Camera2D,
    interaction: CameraInteractionController,
    render: () => void
): () => void {
    const wheel = (event: WheelEvent): void => {
        event.preventDefault();
        const bounds = canvas.getBoundingClientRect();
        const zoom = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
        interaction.zoomAt(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
            zoom * camera.getZoom()
        );
        render();
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return (): void => canvas.removeEventListener("wheel", wheel);
}

function createOverlay(): HTMLElement {
    const heading = document.createElement("header");
    const title = document.createElement("h1");
    title.textContent = uiText.title;
    const subtitle = document.createElement("p");
    subtitle.textContent = uiText.navigationHelp;
    heading.append(title, subtitle);
    return heading;
}
