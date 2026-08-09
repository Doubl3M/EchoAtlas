import { Camera2D, CameraConfig } from "../engine/camera";
import { CameraInteractionController } from "../engine/interaction";
import { TerrainConfig } from "../engine/terrain";
import { CanvasRenderer, CanvasRenderSurface, SeventiesTheme } from "../render";
import { createSeventiesHomeShell } from "../ui/SeventiesHomeShell";
import { WorldConfig, type GeographicWorld, type WorldLocation } from "../world";

import { CameraJourney, planCameraArrival } from "./CameraJourney";
import { demoMusicDocumentJson } from "./demoMusicDocument";
import { createMusicAtlasSnapshot } from "./MusicAtlasPipeline";
import { createMusicSelectionPanel } from "./MusicSelectionPanel";
import { createMusicSelectionRelationProvider } from "./MusicSelectionRelations";
import { uiText } from "./UiText";

const WORLD_WIDTH = 96;
const WORLD_HEIGHT = 64;
const TERRAIN_WIDTH = 192;
const TERRAIN_HEIGHT = 128;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const CONTROL_ZOOM_FACTOR = 1.3;
const LOCATION_HIT_RADIUS = 11;
const CLICK_MOVEMENT_TOLERANCE = 4;
const CAMERA_JOURNEY_DURATION = 650;
const CAMERA_MIN_ZOOM = 0.25;
const CAMERA_MAX_ZOOM = 128;

/** Browser adapter that binds DOM events to the generic interaction controller. */
export function mountNavigableMap(root: HTMLElement): () => void {
    const worldConfig = createWorldConfig();
    const snapshot = createMusicAtlasSnapshot(demoMusicDocumentJson, worldConfig);
    const camera = createCamera(1, 1);
    const interaction = new CameraInteractionController(camera);
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", uiText.canvasLabel);
    const surface = new CanvasRenderSurface(canvas);
    const theme = new SeventiesTheme();
    const renderer = new CanvasRenderer(theme, snapshot.labels);
    let focusedKnowledgeNodeId: string | undefined;
    let visibleKnowledgeNodeIds: ReadonlySet<string> = new Set();

    const render = (): void => {
        const summary = renderer.render(snapshot.world, camera, surface, focusedKnowledgeNodeId);
        visibleKnowledgeNodeIds = new Set(summary.visibleKnowledgeNodeIds);
        canvas.dataset.visibleLabels = String(summary.visibleLabelCount);
        canvas.dataset.visibleLocations = String(summary.visibleKnowledgeNodeIds.length);
        shell.setVisibleLocationCount(summary.visibleKnowledgeNodeIds.length);
    };
    const journey = new CameraJourney({
        camera,
        duration: CAMERA_JOURNEY_DURATION,
        scheduler: {
            request: (callback) => window.requestAnimationFrame(callback),
            cancel: (handle) => window.cancelAnimationFrame(handle),
        },
        render,
    });
    const travelTo = (knowledgeNodeId: string): void => {
        const location = snapshot.world.getLocationByKnowledgeNodeId(knowledgeNodeId);
        if (location === undefined) {
            return;
        }
        focusedKnowledgeNodeId = knowledgeNodeId;
        const bounds = shell.mapViewport.getBoundingClientRect();
        const descriptor = snapshot.labels(knowledgeNodeId);
        const requestedZoom = Math.max(
            theme.label.minZoom,
            descriptor?.minZoom ?? 0,
            snapshot.arrivalZoom(knowledgeNodeId) ?? 1
        );
        const targetZoom = Math.min(CAMERA_MAX_ZOOM, Math.max(CAMERA_MIN_ZOOM, requestedZoom));
        const arrival = planCameraArrival({
            destination: { x: location.x, y: location.y },
            targetZoom,
            worldWidth: WORLD_WIDTH,
            worldHeight: WORLD_HEIGHT,
            viewportWidth: Math.max(1, bounds.width),
            viewportHeight: Math.max(1, bounds.height),
        });
        journey.start(arrival, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    };
    const selectionPanel = createMusicSelectionPanel(
        snapshot.catalog,
        createMusicSelectionRelationProvider(snapshot.catalog, snapshot.graph),
        {
            onRelationSelected: travelTo,
            onClose: () => {
                journey.cancel();
                focusedKnowledgeNodeId = undefined;
                render();
            },
        }
    );
    const resize = (): void => {
        const bounds = shell.mapViewport.getBoundingClientRect();
        const width = Math.max(1, bounds.width);
        const height = Math.max(1, bounds.height);
        surface.resize(width, height, Math.max(1, window.devicePixelRatio));
        camera.setViewport(width, height);
        render();
    };
    const recenter = (): void => {
        journey.cancel();
        const bounds = shell.mapViewport.getBoundingClientRect();
        const fittedZoom =
            Math.max(
                Math.max(1, bounds.width) / WORLD_WIDTH,
                Math.max(1, bounds.height) / WORLD_HEIGHT
            ) * 0.96;
        camera.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
        camera.setZoom(fittedZoom);
        render();
    };
    const zoomFromCenter = (factor: number): void => {
        journey.cancel();
        const bounds = shell.mapViewport.getBoundingClientRect();
        interaction.zoomAt(bounds.width / 2, bounds.height / 2, camera.getZoom() * factor);
        render();
    };
    const shell = createSeventiesHomeShell({
        canvas,
        selectionPanel: selectionPanel.element,
        text: uiText,
        locationCount: snapshot.world.getLocations().length,
        relationCount: snapshot.world.getConnections().length,
        onZoomIn: () => zoomFromCenter(CONTROL_ZOOM_FACTOR),
        onZoomOut: () => zoomFromCenter(1 / CONTROL_ZOOM_FACTOR),
        onRecenter: recenter,
    });
    root.replaceChildren(shell.element);
    const selectLocation = (screenX: number, screenY: number): void => {
        const location = findLocationAtScreen(
            snapshot.world,
            camera,
            screenX,
            screenY,
            (knowledgeNodeId) => {
                if (snapshot.labels(knowledgeNodeId)?.landmarkKind !== "city") {
                    return LOCATION_HIT_RADIUS;
                }
                const city = theme.landmarks.city;
                const extent =
                    camera.getZoom() >= city.detailZoom
                        ? Math.max(
                              city.detailedWidth * (1 + city.widthVariation),
                              city.detailedHeight
                          ) / 2
                        : Math.max(city.compactWidth, city.compactHeight) / 2;
                return extent + city.hitPadding;
            },
            visibleKnowledgeNodeIds
        );
        if (location !== undefined) {
            focusedKnowledgeNodeId = location.knowledgeNodeId;
            selectionPanel.show(location.knowledgeNodeId);
            render();
        }
    };
    const removePointerInteractions = bindPointerInteractions(
        canvas,
        interaction,
        render,
        selectLocation,
        () => journey.cancel()
    );
    const removeWheelInteraction = bindWheelInteraction(canvas, camera, interaction, render, () =>
        journey.cancel()
    );
    resize();
    recenter();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell.mapViewport);

    return (): void => {
        removePointerInteractions();
        removeWheelInteraction();
        journey.cancel();
        resizeObserver.disconnect();
    };
}

function createWorldConfig(): WorldConfig {
    const terrain = new TerrainConfig({
        width: TERRAIN_WIDTH,
        height: TERRAIN_HEIGHT,
        baseFrequency: 0.022,
        octaves: 5,
        persistence: 0.58,
        lacunarity: 2,
        offsetX: -18,
        offsetY: -11,
    });
    return new WorldConfig({
        generationVersion: "world-v1-exact",
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        placementIterations: 32,
        attractionStrength: 0.018,
        repulsionStrength: 0.42,
        terrain,
    });
}

function createCamera(viewportWidth: number, viewportHeight: number): Camera2D {
    const fittedZoom = Math.min(viewportWidth / WORLD_WIDTH, viewportHeight / WORLD_HEIGHT) * 0.88;
    const camera = new Camera2D(
        new CameraConfig({
            viewportWidth,
            viewportHeight,
            minZoom: CAMERA_MIN_ZOOM,
            maxZoom: CAMERA_MAX_ZOOM,
            initialZoom: Math.min(CAMERA_MAX_ZOOM, Math.max(CAMERA_MIN_ZOOM, fittedZoom)),
        })
    );
    camera.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    return camera;
}

function bindPointerInteractions(
    canvas: HTMLCanvasElement,
    interaction: CameraInteractionController,
    render: () => void,
    selectLocation: (screenX: number, screenY: number) => void,
    cancelJourney: () => void
): () => void {
    let startX = 0;
    let startY = 0;
    let hasMoved = false;
    const pointerDown = (event: PointerEvent): void => {
        cancelJourney();
        canvas.setPointerCapture(event.pointerId);
        startX = event.clientX;
        startY = event.clientY;
        hasMoved = false;
        interaction.beginPan(event.clientX, event.clientY);
    };
    const pointerMove = (event: PointerEvent): void => {
        if (!canvas.hasPointerCapture(event.pointerId)) {
            return;
        }
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        if (deltaX * deltaX + deltaY * deltaY > CLICK_MOVEMENT_TOLERANCE ** 2) {
            hasMoved = true;
        }
        interaction.movePan(event.clientX, event.clientY);
        render();
    };
    const pointerUp = (event: PointerEvent): void => {
        interaction.endPan();
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
        if (!hasMoved) {
            const bounds = canvas.getBoundingClientRect();
            selectLocation(event.clientX - bounds.left, event.clientY - bounds.top);
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

export function findLocationAtScreen(
    world: GeographicWorld,
    camera: Camera2D,
    screenX: number,
    screenY: number,
    hitRadius: number | ((knowledgeNodeId: string) => number),
    visibleKnowledgeNodeIds: ReadonlySet<string>
): WorldLocation | undefined {
    const target = camera.screenToWorld(screenX, screenY);
    let selected: WorldLocation | undefined;
    let selectedDistanceSquared = Number.POSITIVE_INFINITY;
    for (const location of world.getLocations()) {
        if (!visibleKnowledgeNodeIds.has(location.knowledgeNodeId)) {
            continue;
        }
        const deltaX = location.x - target.x;
        const deltaY = location.y - target.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        const screenRadius =
            typeof hitRadius === "number" ? hitRadius : hitRadius(location.knowledgeNodeId);
        const worldRadius = screenRadius / camera.getZoom();
        if (
            distanceSquared <= worldRadius * worldRadius &&
            distanceSquared <= selectedDistanceSquared
        ) {
            selected = location;
            selectedDistanceSquared = distanceSquared;
        }
    }
    return selected;
}

function bindWheelInteraction(
    canvas: HTMLCanvasElement,
    camera: Camera2D,
    interaction: CameraInteractionController,
    render: () => void,
    cancelJourney: () => void
): () => void {
    const wheel = (event: WheelEvent): void => {
        event.preventDefault();
        cancelJourney();
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
