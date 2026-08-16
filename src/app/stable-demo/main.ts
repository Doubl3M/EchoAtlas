import { createCurrentBroadcastPanel } from "../CurrentBroadcastPanel";
import { createDemoCurrentBroadcast } from "../demoCurrentBroadcast";
import { createDemoTemporalMusicAtlas } from "../demoTemporalMusicAtlas";
import { createDemoWorldConfig } from "../demoWorldConfig";
import { formatHistoricalDate } from "../HistoricalTimelineControl";
import type { TemporalMusicAtlasState } from "../TemporalMusicAtlas";
import "../../ui/seventies-home.css";

import { projectStableDemo, type StableDemoSnapshot } from "./StableDemoModel";
import { createStableDemoPanel } from "./StableDemoPanel";
import { StableDemoRenderer } from "./StableDemoRenderer";
import { stableDemoText } from "./StableDemoText";
import "./stable-demo.css";

const root = document.querySelector<HTMLElement>("#echoatlas-demo");
if (root === null) throw new Error("EchoAtlas demo root was not found.");

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
let presentation: StableDemoSnapshot = projectStableDemo(state);
let selectedFeatureId: string | undefined;
let selectedKnowledgeNodeId: string | undefined;

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
svg.setAttribute("aria-label", "Carte musicale EchoAtlas");
const radio = createRadioLandmark();
map.append(svg, radio);
const timeline = document.createElement("nav");
timeline.className = "semantic-atlas-timeline";
timeline.setAttribute("aria-label", stableDemoText.history);
const footer = document.createElement("footer");
footer.className = "semantic-atlas-footer";

const musicPanel = createStableDemoPanel(
    () => presentation,
    () => state,
    () => {
        selectedFeatureId = undefined;
        selectedKnowledgeNodeId = undefined;
        renderMap();
    }
);
const broadcast = createDemoCurrentBroadcast();
const broadcastPanel = createCurrentBroadcastPanel(broadcast, () => undefined);
exploration.append(map, musicPanel.element, broadcastPanel.element);
shell.append(header, rail, exploration, timeline, footer);
root.replaceChildren(shell);

const renderer = new StableDemoRenderer();
render();
applyInitialSelection();

function render(): void {
    renderMap();
    renderTimeline();
    renderFooter();
}

function renderMap(): void {
    map.dataset.continentCount = String(presentation.continents.length);
    map.dataset.districtCount = String(presentation.districts.length);
    map.dataset.buildingCount = String(presentation.buildings.length);
    map.dataset.ruinedDistrictCount = String(
        presentation.districts.filter(({ isRuined }) => isRuined).length
    );
    renderer.render(svg, {
        snapshot: presentation,
        width: state.layout.width,
        height: state.layout.height,
        selectedFeatureId,
        onSelect: (featureId, knowledgeNodeId) => {
            selectedFeatureId = featureId;
            selectedKnowledgeNodeId = knowledgeNodeId;
            broadcastPanel.hide();
            musicPanel.show(knowledgeNodeId, featureId);
            renderMap();
        },
    });
}

function renderTimeline(): void {
    timeline.replaceChildren();
    timeline.dataset.selectedAt = String(selectedAt);
    milestones.forEach((at, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = at === selectedAt ? "is-selected" : "";
        button.dataset.milestoneIndex = String(index);
        button.innerHTML = `<i aria-hidden="true"></i><span>${stableDemoText.era} ${index + 1}</span><strong>${index === milestones.length - 1 ? stableDemoText.present : formatHistoricalDate(at)}</strong><small>${formatHistoricalDate(at)}</small>`;
        button.addEventListener("click", () => changeTime(at));
        timeline.append(button);
    });
}

function changeTime(at: number): void {
    selectedAt = at;
    state = atlas.project(at);
    presentation = projectStableDemo(state);
    if (
        selectedFeatureId !== undefined &&
        state.hierarchy.getFeatureById(selectedFeatureId) === undefined
    ) {
        selectedFeatureId = undefined;
        selectedKnowledgeNodeId = undefined;
        musicPanel.hide();
    }
    if (selectedFeatureId !== undefined && selectedKnowledgeNodeId !== undefined) {
        musicPanel.show(selectedKnowledgeNodeId, selectedFeatureId);
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
    element.innerHTML = `<div class="semantic-atlas-brand"><span aria-hidden="true">✺</span><div><h1>EchoAtlas</h1><p>${stableDemoText.brandSubtitle}</p></div></div><p>${stableDemoText.intro}</p><span class="semantic-atlas-compass" aria-hidden="true">✣</span>`;
    return element;
}

function createRail(): HTMLElement {
    const element = document.createElement("nav");
    element.className = "semantic-atlas-rail";
    element.setAttribute("aria-label", stableDemoText.explorer);
    element.innerHTML = `<span aria-hidden="true">⌾</span><strong>${stableDemoText.explorer}</strong>`;
    return element;
}

function createRadioLandmark(): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "semantic-radio-landmark";
    button.dataset.landmarkKind = "current-broadcast";
    button.setAttribute("aria-label", stableDemoText.pirateRadio);
    button.innerHTML = `<span class="semantic-radio-landmark__tower" aria-hidden="true"><i></i><b></b><em></em></span><span class="semantic-radio-landmark__waves" aria-hidden="true"></span><strong>${stableDemoText.pirateRadio}</strong><small>${stableDemoText.radioHelp}</small>`;
    button.addEventListener("click", () => {
        musicPanel.hide();
        selectedFeatureId = undefined;
        selectedKnowledgeNodeId = undefined;
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
    selectedKnowledgeNodeId = feature.sourceKnowledgeNodeId;
    musicPanel.show(feature.sourceKnowledgeNodeId, feature.id);
    renderMap();
}
