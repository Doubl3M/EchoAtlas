import { createCurrentBroadcastPanel } from "../../src/app/CurrentBroadcastPanel";
import { createDemoCurrentBroadcast } from "../../src/app/demoCurrentBroadcast";
import { createDemoTemporalMusicAtlas } from "../../src/app/demoTemporalMusicAtlas";
import { createDemoWorldConfig } from "../../src/app/demoWorldConfig";
import { formatHistoricalDate } from "../../src/app/HistoricalTimelineControl";
import type { TemporalMusicAtlasState } from "../../src/app/TemporalMusicAtlas";
import "../../src/ui/seventies-home.css";

import { projectSemanticBridge, type SemanticBridgeSnapshot } from "./SemanticBridgeModel";
import { createSemanticBridgePanel } from "./SemanticBridgePanel";
import { SemanticBridgeRenderer } from "./SemanticBridgeRenderer";
import { semanticBridgeText } from "./SemanticBridgeText";
import "./seventies-semantic-demo.css";

const root = document.querySelector<HTMLElement>("#seventies-semantic-demo");
if (root === null) throw new Error("Seventies semantic demo root was not found.");

const atlas = createDemoTemporalMusicAtlas(createDemoWorldConfig());
const milestones = atlas.getMilestones();
if (milestones.length === 0) throw new Error("Semantic demo requires historical milestones.");
const query = new URLSearchParams(window.location.search);
const requestedMilestone = Number(query.get("milestone"));
let selectedAt =
    (query.has("milestone") && Number.isInteger(requestedMilestone)
        ? milestones[requestedMilestone]
        : undefined) ??
    atlas.getInitialHistoricalTime() ??
    milestones[0];
if (selectedAt === undefined) throw new Error("Semantic demo milestone is unavailable.");
let state: TemporalMusicAtlasState = atlas.project(selectedAt);
let presentation: SemanticBridgeSnapshot = projectSemanticBridge(state);
let selectedFeatureId: string | undefined;

const shell = document.createElement("div");
shell.className = "semantic-atlas-shell";
const header = createHeader();
const rail = createRail();
const exploration = document.createElement("main");
exploration.className = "semantic-atlas-exploration";
const map = document.createElement("section");
map.className = "semantic-atlas-map";
const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute("role", "img");
svg.setAttribute("aria-label", "Atlas musical sémantique EchoAtlas");
const radio = createRadioLandmark();
map.append(svg, radio);
const timeline = document.createElement("nav");
timeline.className = "semantic-atlas-timeline";
timeline.setAttribute("aria-label", semanticBridgeText.history);
const footer = document.createElement("footer");
footer.className = "semantic-atlas-footer";

const musicPanel = createSemanticBridgePanel(
    () => presentation,
    () => state,
    () => {
        selectedFeatureId = undefined;
        renderMap();
    }
);
const broadcast = createDemoCurrentBroadcast();
const broadcastPanel = createCurrentBroadcastPanel(broadcast, () => undefined);
exploration.append(map, musicPanel.element, broadcastPanel.element);
shell.append(header, rail, exploration, timeline, footer);
root.replaceChildren(shell);

const renderer = new SemanticBridgeRenderer();
render();
applyInitialSelection();

function render(): void {
    renderMap();
    renderTimeline();
    renderFooter();
}

function renderMap(): void {
    renderer.render(svg, {
        snapshot: presentation,
        width: state.layout.width,
        height: state.layout.height,
        selectedFeatureId,
        onSelect: (featureId, knowledgeNodeId) => {
            selectedFeatureId = featureId;
            broadcastPanel.hide();
            musicPanel.show(knowledgeNodeId, featureId);
            renderMap();
        },
    });
}

function renderTimeline(): void {
    timeline.replaceChildren();
    milestones.forEach((at, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = at === selectedAt ? "is-selected" : "";
        button.dataset.milestoneIndex = String(index);
        button.innerHTML = `<i aria-hidden="true"></i><span>${semanticBridgeText.era} ${index + 1}</span><strong>${index === milestones.length - 1 ? semanticBridgeText.present : formatHistoricalDate(at)}</strong><small>${formatHistoricalDate(at)}</small>`;
        button.addEventListener("click", () => changeTime(at));
        timeline.append(button);
    });
}

function changeTime(at: number): void {
    selectedAt = at;
    state = atlas.project(at);
    presentation = projectSemanticBridge(state);
    if (
        selectedFeatureId !== undefined &&
        state.hierarchy.getFeatureById(selectedFeatureId) === undefined
    ) {
        selectedFeatureId = undefined;
        musicPanel.hide();
    }
    render();
}

function renderFooter(): void {
    const ruined = presentation.districts.filter(({ isRuined }) => isRuined).length;
    footer.innerHTML = `<p><strong>${presentation.continents.length}</strong><span>Continents</span></p><p><strong>${presentation.districts.length}</strong><span>Quartiers</span></p><p><strong>${presentation.buildings.length}</strong><span>Bâtiments</span></p><p><strong>${ruined}</strong><span>Quartiers endormis</span></p><blockquote>« Chaque écoute révèle un territoire. »</blockquote>`;
}

function createHeader(): HTMLElement {
    const element = document.createElement("header");
    element.className = "semantic-atlas-header";
    element.innerHTML = `<div class="semantic-atlas-brand"><span aria-hidden="true">✺</span><div><h1>EchoAtlas</h1><p>${semanticBridgeText.brandSubtitle}</p></div></div><p>${semanticBridgeText.intro}</p><span class="semantic-atlas-compass" aria-hidden="true">✣</span>`;
    return element;
}

function createRail(): HTMLElement {
    const element = document.createElement("nav");
    element.className = "semantic-atlas-rail";
    element.setAttribute("aria-label", semanticBridgeText.explorer);
    element.innerHTML = `<span aria-hidden="true">⌾</span><strong>${semanticBridgeText.explorer}</strong>`;
    return element;
}

function createRadioLandmark(): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "semantic-radio-landmark";
    button.dataset.landmarkKind = "current-broadcast";
    button.setAttribute("aria-label", semanticBridgeText.pirateRadio);
    button.innerHTML = `<span class="semantic-radio-landmark__tower" aria-hidden="true"><i></i><b></b><em></em></span><span class="semantic-radio-landmark__waves" aria-hidden="true"></span><strong>${semanticBridgeText.pirateRadio}</strong><small>${semanticBridgeText.radioHelp}</small>`;
    button.addEventListener("click", () => {
        musicPanel.hide();
        selectedFeatureId = undefined;
        renderMap();
        broadcastPanel.show();
    });
    return button;
}

function applyInitialSelection(): void {
    if (query.get("radio") === "1") {
        radio.click();
        return;
    }
    const requested = query.get("select");
    if (requested === null) return;
    const feature =
        state.hierarchy
            .getFeaturesByKnowledgeNodeId(requested)
            .find(({ role }) => role !== "continent") ??
        state.hierarchy.getFeaturesByKnowledgeNodeId(requested)[0];
    if (feature?.sourceKnowledgeNodeId === undefined) return;
    selectedFeatureId = feature.id;
    musicPanel.show(feature.sourceKnowledgeNodeId, feature.id);
    renderMap();
}
