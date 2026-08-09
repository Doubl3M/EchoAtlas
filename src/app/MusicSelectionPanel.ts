import type { MusicCatalog, MusicEntity } from "../music";

import { uiText } from "./UiText";

export interface MusicSelectionPanel {
    readonly element: HTMLElement;
    show(knowledgeNodeId: string): void;
    close(): void;
}

/** Browser-only editorial presentation of Music data resolved from a canonical node identity. */
export function createMusicSelectionPanel(catalog: MusicCatalog): MusicSelectionPanel {
    const entities = new Map<string, MusicEntity>(
        catalog
            .getEntities()
            .map((entity) => [`music:${entity.kind}:${entity.id}`, entity] as const)
    );
    const element = document.createElement("aside");
    element.className = "selection-panel";
    element.hidden = true;
    element.setAttribute("aria-labelledby", "selection-panel-title");

    const closeButton = createCloseButton(() => close());
    const close = (): void => {
        element.hidden = true;
        delete element.dataset.selectedId;
        delete element.dataset.entityKind;
        element.replaceChildren(closeButton);
    };
    const show = (knowledgeNodeId: string): void => {
        const entity = entities.get(knowledgeNodeId);
        if (entity === undefined) {
            return;
        }
        element.dataset.selectedId = knowledgeNodeId;
        element.dataset.entityKind = entity.kind;
        element.replaceChildren(
            closeButton,
            createHeader(entity),
            ...(entity.kind === "artist" ? [createCityMotif()] : []),
            createAttributes(entity),
            createFutureSpace()
        );
        element.hidden = false;
    };
    return Object.freeze({ element, show, close });
}

function createCloseButton(close: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selection-panel__close";
    button.setAttribute("aria-label", uiText.closeSelection);
    button.textContent = uiText.closeSymbol;
    button.addEventListener("click", close);
    return button;
}

function createHeader(entity: MusicEntity): HTMLElement {
    const header = document.createElement("header");
    header.className = "selection-panel__header";
    const kind = document.createElement("p");
    kind.className = "selection-panel__kind";
    kind.textContent = uiText.entityKinds[entity.kind];
    const title = document.createElement("h2");
    title.id = "selection-panel-title";
    title.textContent = entity.title ?? entity.name ?? entity.id;
    header.append(kind, title);
    return header;
}

function createAttributes(entity: MusicEntity): HTMLElement {
    const attributes = attributesFor(entity);
    const section = document.createElement("section");
    section.className = "selection-panel__metadata";
    section.setAttribute("aria-label", uiText.selectionDetails);
    const list = document.createElement("dl");
    for (const [label, value] of attributes) {
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = value;
        list.append(term, description);
    }
    section.append(list);
    return section;
}

function attributesFor(entity: MusicEntity): readonly (readonly [string, string])[] {
    const attributes: [string, string][] = [];
    if (entity.kind === "artist") {
        appendAttribute(attributes, uiText.fields.country, entity.country);
        appendAttribute(attributes, uiText.fields.formed, entity.formed);
    } else if (entity.kind === "album") {
        appendAttribute(attributes, uiText.fields.year, entity.year);
        appendAttribute(attributes, uiText.fields.duration, entity.duration);
    } else if (entity.kind === "track") {
        appendAttribute(attributes, uiText.fields.duration, entity.duration);
        appendAttribute(attributes, uiText.fields.trackNumber, entity.trackNumber);
    }
    return attributes;
}

function appendAttribute(
    attributes: [string, string][],
    label: string,
    value: string | number | undefined
): void {
    if (value !== undefined) {
        attributes.push([label, String(value)]);
    }
}

function createCityMotif(): HTMLElement {
    const motif = document.createElement("div");
    motif.className = "selection-panel__city";
    motif.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 4; index += 1) {
        const building = document.createElement("span");
        building.className = `selection-panel__city-building selection-panel__city-building--${index + 1}`;
        motif.append(building);
    }
    return motif;
}

function createFutureSpace(): HTMLElement {
    const section = document.createElement("div");
    section.className = "selection-panel__future";
    section.setAttribute("aria-hidden", "true");
    return section;
}
