import type { MusicEntity } from "../../src/music";
import { GeographicFocusResolver } from "../../src/world";
import { formatHistoricalDate } from "../../src/app/HistoricalTimelineControl";
import type { TemporalMusicAtlasState } from "../../src/app/TemporalMusicAtlas";
import { uiText } from "../../src/app/UiText";

import type { SemanticBridgeBuilding, SemanticBridgeSnapshot } from "./SemanticBridgeModel";
import { getEntityByKnowledgeNodeId } from "./SemanticBridgeModel";
import { semanticBridgeText } from "./SemanticBridgeText";

export interface SemanticBridgePanel {
    readonly element: HTMLElement;
    show(knowledgeNodeId: string, selectedFeatureId: string): void;
    hide(): void;
}

export function createSemanticBridgePanel(
    getSnapshot: () => SemanticBridgeSnapshot,
    getState: () => TemporalMusicAtlasState,
    onClose: () => void
): SemanticBridgePanel {
    const element = document.createElement("aside");
    element.className = "bridge-panel selection-panel";
    element.hidden = true;
    const hide = (): void => {
        element.hidden = true;
        element.replaceChildren();
    };
    const show = (knowledgeNodeId: string, selectedFeatureId: string): void => {
        const snapshot = getSnapshot();
        const entity = getEntityByKnowledgeNodeId(snapshot.catalog, knowledgeNodeId);
        if (entity === undefined) return;
        const close = document.createElement("button");
        close.type = "button";
        close.className = "selection-panel__close";
        close.setAttribute("aria-label", semanticBridgeText.close);
        close.textContent = "×";
        close.addEventListener("click", () => {
            hide();
            onClose();
        });
        element.replaceChildren(close, header(entity), details(entity));
        const state = getState();
        const representations = new GeographicFocusResolver(state.hierarchy).resolveFocusTargets(
            knowledgeNodeId
        );
        if (representations.length > 1) {
            element.append(representationNote(representations.length));
        }
        const selectedAppearance = state.appearance.getAppearance(selectedFeatureId);
        const activity = state.activity?.getActivity(entity.kind, entity.id);
        if (
            entity.kind === "artist" &&
            selectedAppearance?.condition === "ruined" &&
            activity !== undefined
        ) {
            element.append(activityNote(activity.lastActivityAt));
        }
        if (entity.kind === "album") {
            const building = snapshot.buildings.find(
                ({ feature }) => feature.id === selectedFeatureId
            );
            if (building !== undefined) element.append(trackList(building));
        }
        element.hidden = false;
        element.dataset.selectedKnowledgeNodeId = knowledgeNodeId;
        element.dataset.selectedFeatureId = selectedFeatureId;
    };
    return Object.freeze({ element, show, hide });
}

function activityNote(lastActivityAt: number): HTMLElement {
    const section = document.createElement("section");
    section.className = "bridge-panel__activity";
    const state = document.createElement("strong");
    state.textContent = uiText.artistSleeping;
    const date = document.createElement("span");
    date.textContent = `${uiText.lastListening}: ${formatHistoricalDate(lastActivityAt)}`;
    section.append(state, date);
    return section;
}

function header(entity: MusicEntity): HTMLElement {
    const element = document.createElement("header");
    element.className = "selection-panel__header bridge-panel__header";
    const kind = document.createElement("p");
    kind.className = "selection-panel__kind";
    kind.textContent = semanticBridgeText.kinds[entity.kind];
    const title = document.createElement("h2");
    title.textContent = entity.name ?? entity.title ?? entity.id;
    element.append(kind, title);
    return element;
}

function details(entity: MusicEntity): HTMLElement {
    const element = document.createElement("div");
    element.className = "bridge-panel__details";
    const geography = document.createElement("p");
    geography.textContent = semanticBridgeText.geography[entity.kind];
    element.append(geography);
    const values: readonly (readonly [string, string | number | undefined])[] = [
        [semanticBridgeText.country, entity.country],
        [semanticBridgeText.formed, entity.formed],
        [semanticBridgeText.year, entity.year],
        [semanticBridgeText.duration, entity.duration],
    ];
    const list = document.createElement("dl");
    for (const [label, value] of values) {
        if (value === undefined) continue;
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = String(value);
        list.append(term, description);
    }
    element.append(list);
    return element;
}

function representationNote(count: number): HTMLElement {
    const note = document.createElement("p");
    note.className = "bridge-panel__representations";
    note.textContent = `${semanticBridgeText.presentIn} ${count} ${semanticBridgeText.territories}`;
    return note;
}

function trackList(building: SemanticBridgeBuilding): HTMLElement {
    const section = document.createElement("section");
    section.className = "bridge-panel__tracks";
    const heading = document.createElement("h3");
    heading.textContent = semanticBridgeText.insideBuilding;
    const list = document.createElement("ol");
    for (const track of building.tracks) {
        const item = document.createElement("li");
        const number = document.createElement("span");
        number.textContent = track.trackNumber === undefined ? "—" : String(track.trackNumber);
        const title = document.createElement("strong");
        title.textContent = track.title ?? track.id;
        item.append(number, title);
        list.append(item);
    }
    section.append(heading, list);
    return section;
}
