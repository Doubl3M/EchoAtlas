import { bootstrap } from "./app";
import { Camera2D, CameraConfig } from "./engine/camera";
import { TerrainConfig } from "./engine/terrain";
import { KnowledgeGraph, KnowledgeNode, KnowledgeRelation } from "./knowledge";
import { CanvasRenderer, CanvasRenderSurface, SeventiesTheme } from "./render";
import { WorldConfig, WorldGenerator } from "./world";

const WORLD_WIDTH = 36;
const WORLD_HEIGHT = 24;

const root = document.querySelector<HTMLElement>("#app");
if (root === null) {
    throw new Error("Application root element was not found.");
}

await bootstrap();

const nodes = Array.from(
    { length: 10 },
    (_, index) =>
        new KnowledgeNode({
            id: `node-${String.fromCharCode(97 + index)}`,
            kind: "concept",
            weight: 1,
        })
);
const relationPairs = [
    ["node-a", "node-b"],
    ["node-b", "node-c"],
    ["node-c", "node-d"],
    ["node-d", "node-e"],
    ["node-e", "node-f"],
    ["node-f", "node-g"],
    ["node-g", "node-h"],
    ["node-h", "node-i"],
    ["node-i", "node-j"],
    ["node-a", "node-f"],
    ["node-c", "node-h"],
] as const;
const relations = relationPairs.map(
    ([sourceId, targetId], index) =>
        new KnowledgeRelation({
            id: `relation-${index + 1}`,
            sourceId,
            targetId,
            kind: "association",
            weight: 1,
        })
);
const graph = new KnowledgeGraph(nodes, relations);
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
const worldConfig = new WorldConfig({
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    placementIterations: 24,
    attractionStrength: 0.025,
    repulsionStrength: 0.35,
    terrain,
});
const world = new WorldGenerator().generate("echoatlas-demo", worldConfig, graph);
const viewportWidth = Math.max(1, window.innerWidth);
const viewportHeight = Math.max(1, window.innerHeight);
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

const canvas = document.createElement("canvas");
canvas.setAttribute("aria-label", "EchoAtlas geographic world");
const heading = document.createElement("header");
const title = document.createElement("h1");
title.textContent = "EchoAtlas";
const subtitle = document.createElement("p");
subtitle.textContent = "Geographic World — Renderer Foundation";
heading.append(title, subtitle);
root.replaceChildren(canvas, heading);

const surface = new CanvasRenderSurface(canvas);
const renderer = new CanvasRenderer(new SeventiesTheme());

function resizeAndRender(): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const devicePixelRatio = Math.max(1, window.devicePixelRatio);
    surface.resize(width, height, devicePixelRatio);
    camera.setViewport(width, height);
    renderer.render(world, camera, surface);
}

window.addEventListener("resize", resizeAndRender);
resizeAndRender();
