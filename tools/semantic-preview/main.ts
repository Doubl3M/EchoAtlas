import { musicKnowledgeNodeId, type MusicCatalog, type MusicEntity } from "../../src/music";
import {
    GeographicFocusResolver,
    resolveGeographicSpatialFocus,
    type GeographicFeature,
} from "../../src/world";

import { formatHistoricalDate } from "../../src/app/HistoricalTimelineControl";
import { createDemoTemporalMusicAtlas } from "../../src/app/demoTemporalMusicAtlas";
import { createDemoWorldConfig } from "../../src/app/demoWorldConfig";
import { countSemanticGeography } from "./SemanticGeographyDiagnostics";
import {
    SemanticAtlasPreviewRenderer,
    type SemanticPreviewLabelProvider,
} from "./SemanticAtlasPreviewRenderer";
import { semanticPreviewText as uiText } from "./SemanticPreviewText";
import "./semantic-preview.css";

const root = document.querySelector<HTMLElement>("#semantic-preview");
if (root === null) throw new Error("Semantic preview root was not found.");

const atlas = createDemoTemporalMusicAtlas(createDemoWorldConfig());
const milestones = atlas.getMilestones();
const milestoneParameter = new URLSearchParams(window.location.search).get("milestone");
const requestedMilestone = milestoneParameter === null ? undefined : Number(milestoneParameter);
let selectedAt =
    (requestedMilestone !== undefined && Number.isInteger(requestedMilestone)
        ? milestones[requestedMilestone]
        : undefined) ??
    atlas.getInitialHistoricalTime() ??
    milestones[0];
if (selectedAt === undefined) throw new Error("Semantic preview requires historical milestones.");
let state = atlas.project(selectedAt);
let selectedKnowledgeNodeId = musicKnowledgeNodeId("artist", "david-bowie");
let debugBounds = false;

const shell = document.createElement("div");
shell.className = "semantic-preview-shell";
const header = createHeader();
const controls = document.createElement("nav");
controls.className = "semantic-preview-timeline";
controls.setAttribute("aria-label", uiText.semanticTimeline);
const main = document.createElement("div");
main.className = "semantic-preview-main";
const mapFrame = document.createElement("section");
mapFrame.className = "semantic-preview-map";
const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute("role", "img");
svg.setAttribute("aria-label", uiText.semanticMapLabel);
const panel = document.createElement("aside");
panel.className = "semantic-preview-panel";
mapFrame.append(svg);
main.append(mapFrame, panel);
const footer = document.createElement("footer");
footer.className = "semantic-preview-footer";
shell.append(header, controls, main, footer);
root.replaceChildren(shell);

const renderer = new SemanticAtlasPreviewRenderer();
render();

function render(): void {
    const labels = createLabels(state.presence?.getCatalog() ?? state.catalog);
    renderer.render(svg, {
        hierarchy: state.hierarchy,
        layout: state.layout,
        appearance: state.appearance,
        labels,
        selectedKnowledgeNodeId,
        debugBounds,
        onSelect: (knowledgeNodeId) => {
            selectedKnowledgeNodeId = knowledgeNodeId;
            render();
        },
    });
    renderTimeline();
    renderPanel(labels);
    renderFooter();
}

function createHeader(): HTMLElement {
    const element = document.createElement("header");
    element.className = "semantic-preview-header";
    const brand = document.createElement("div");
    brand.innerHTML = `<span aria-hidden="true">✦</span><div><h1>EchoAtlas</h1><p>${uiText.semanticPreview}</p></div>`;
    const copy = document.createElement("p");
    copy.textContent = uiText.semanticPreviewHelp;
    element.append(brand, copy);
    return element;
}

function renderTimeline(): void {
    controls.replaceChildren();
    milestones.forEach((at, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.milestoneIndex = String(index);
        button.dataset.at = String(at);
        button.className = at === selectedAt ? "is-selected" : "";
        button.innerHTML = `<span>${uiText.semanticEra} ${index + 1}</span><strong>${formatHistoricalDate(at)}</strong>`;
        button.addEventListener("click", () => {
            selectedAt = at;
            state = atlas.project(at);
            render();
        });
        controls.append(button);
    });
    const debug = document.createElement("label");
    debug.className = "semantic-preview-debug";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = debugBounds;
    checkbox.addEventListener("change", () => {
        debugBounds = checkbox.checked;
        render();
    });
    debug.append(checkbox, uiText.semanticDebugBounds);
    controls.append(debug);
}

function renderPanel(labels: SemanticPreviewLabelProvider): void {
    panel.replaceChildren();
    panel.dataset.selectedKnowledgeNodeId = selectedKnowledgeNodeId;
    const catalog = state.presence?.getCatalog() ?? state.catalog;
    const entity = findEntity(catalog, selectedKnowledgeNodeId);
    const eyebrow = document.createElement("p");
    eyebrow.className = "semantic-preview-panel__eyebrow";
    eyebrow.textContent = entity?.kind ?? uiText.semanticSelection;
    const title = document.createElement("h2");
    title.textContent = labels(selectedKnowledgeNodeId) ?? selectedKnowledgeNodeId;
    const quick = createQuickSelection(catalog);
    const resolver = new GeographicFocusResolver(state.hierarchy);
    const targets = resolver.resolveFocusTargets(selectedKnowledgeNodeId);
    const summary = document.createElement("p");
    summary.className = "semantic-preview-panel__summary";
    summary.textContent = `${targets.length} ${uiText.semanticRepresentations}`;
    const list = document.createElement("ol");
    list.className = "semantic-preview-panel__representations";
    for (const target of targets) {
        const feature = state.hierarchy.getFeatureById(target.featureId);
        const focus = resolveGeographicSpatialFocus(target, state.layout);
        const item = document.createElement("li");
        const branch = feature === undefined ? [] : featurePath(feature);
        item.innerHTML = `<strong>${target.representationKind === "content-container" ? uiText.semanticBuildingContent : feature?.role}</strong><span>${branch.map((value) => labels(value.sourceKnowledgeNodeId ?? "") ?? value.role).join(" → ")}</span><small>${focus.x.toFixed(1)}, ${focus.y.toFixed(1)}</small>`;
        list.append(item);
    }
    panel.append(eyebrow, title, quick, summary, list);
}

function createQuickSelection(catalog: MusicCatalog): HTMLElement {
    const group = document.createElement("div");
    group.className = "semantic-preview-panel__quick";
    const identities = [
        ["genre", "rock"],
        ["genre", "electronic"],
        ["artist", "david-bowie"],
        ["album", "low"],
        ["track", "sound-and-vision"],
    ] as const;
    for (const [kind, id] of identities) {
        if (!catalog.getEntities().some((entity) => entity.kind === kind && entity.id === id)) {
            continue;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.textContent =
            findEntity(catalog, musicKnowledgeNodeId(kind, id))?.name ??
            findEntity(catalog, musicKnowledgeNodeId(kind, id))?.title ??
            id;
        button.addEventListener("click", () => {
            selectedKnowledgeNodeId = musicKnowledgeNodeId(kind, id);
            render();
        });
        group.append(button);
    }
    return group;
}

function renderFooter(): void {
    const counts = countSemanticGeography(state);
    footer.replaceChildren();
    for (const [label, value] of [
        [uiText.semanticContinents, counts.continents],
        [uiText.semanticDistricts, counts.districts],
        [uiText.semanticBuildings, counts.buildings],
        [uiText.semanticContents, counts.contents],
        [uiText.semanticRuinedDistricts, counts.ruinedDistricts],
    ] as const) {
        const item = document.createElement("p");
        item.dataset.metric = label;
        item.dataset.value = String(value);
        item.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
        footer.append(item);
    }
}

function createLabels(catalog: MusicCatalog): SemanticPreviewLabelProvider {
    const labels = new Map<string, string>();
    for (const entity of catalog.getEntities()) {
        labels.set(
            musicKnowledgeNodeId(entity.kind, entity.id),
            entity.name ?? entity.title ?? entity.id
        );
    }
    return (knowledgeNodeId) => labels.get(knowledgeNodeId);
}

function findEntity(catalog: MusicCatalog, knowledgeNodeId: string): MusicEntity | undefined {
    return catalog
        .getEntities()
        .find((entity) => musicKnowledgeNodeId(entity.kind, entity.id) === knowledgeNodeId);
}

function featurePath(feature: GeographicFeature): readonly GeographicFeature[] {
    const reversed: GeographicFeature[] = [];
    let current: GeographicFeature | undefined = feature;
    while (current !== undefined) {
        reversed.push(current);
        current = state.hierarchy.getParent(current.id);
    }
    return reversed.reverse();
}
