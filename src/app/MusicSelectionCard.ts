import type { MusicCatalog, MusicEntity, MusicEntityKind } from "../music";

import { uiText } from "./UiText";

export interface MusicSelectionCard {
    readonly element: HTMLElement;
    show(knowledgeNodeId: string): void;
    close(): void;
}

/** Browser-only presentation of existing Music data for a selected canonical node identity. */
export function createMusicSelectionCard(catalog: MusicCatalog): MusicSelectionCard {
    const entities = new Map<string, MusicEntity>(
        catalog
            .getEntities()
            .map((entity) => [`music:${entity.kind}:${entity.id}`, entity] as const)
    );
    const element = document.createElement("aside");
    element.className = "selection-card";
    element.hidden = true;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "selection-card__close";
    closeButton.setAttribute("aria-label", uiText.closeSelection);
    closeButton.textContent = uiText.closeSymbol;
    closeButton.addEventListener("click", () => {
        element.hidden = true;
        element.replaceChildren(closeButton);
    });

    const show = (knowledgeNodeId: string): void => {
        const entity = entities.get(knowledgeNodeId);
        if (entity === undefined) {
            return;
        }
        element.replaceChildren(closeButton, createKind(entity.kind), createTitle(entity));
        const attributes = createAttributes(entity);
        if (attributes !== undefined) {
            element.append(attributes);
        }
        element.hidden = false;
    };
    const close = (): void => {
        element.hidden = true;
        element.replaceChildren(closeButton);
    };
    return Object.freeze({ element, show, close });
}

function createKind(kind: MusicEntityKind): HTMLElement {
    const value = document.createElement("p");
    value.className = "selection-card__kind";
    value.textContent = uiText.entityKinds[kind];
    return value;
}

function createTitle(entity: MusicEntity): HTMLElement {
    const title = document.createElement("h2");
    title.textContent = entity.title ?? entity.name ?? entity.id;
    return title;
}

function createAttributes(entity: MusicEntity): HTMLElement | undefined {
    const attributes: [string, string][] = [];
    appendAttribute(attributes, uiText.fields.country, entity.country);
    appendAttribute(attributes, uiText.fields.formed, entity.formed);
    appendAttribute(attributes, uiText.fields.year, entity.year);
    appendAttribute(attributes, uiText.fields.duration, entity.duration);
    appendAttribute(attributes, uiText.fields.trackNumber, entity.trackNumber);
    if (attributes.length === 0) {
        return undefined;
    }
    const list = document.createElement("dl");
    for (const [label, value] of attributes) {
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = value;
        list.append(term, description);
    }
    return list;
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
