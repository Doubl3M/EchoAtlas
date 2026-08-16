import type { MusicCatalog, MusicEntity } from "../music";

import { uiText } from "./UiText";
import type {
    MusicSelectionRelation,
    MusicSelectionRelationProvider,
} from "./MusicSelectionRelations";

const CONNECTION_DISPLAY_LIMIT = 6;

export interface MusicSelectionPanel {
    readonly element: HTMLElement;
    show(knowledgeNodeId: string): void;
    hide(): void;
    close(): void;
    updateSource(catalog: MusicCatalog, relationProvider: MusicSelectionRelationProvider): void;
    getSelectedKnowledgeNodeId(): string | undefined;
}

export interface MusicSelectionPanelActions {
    readonly onRelationSelected: (knowledgeNodeId: string) => void;
    readonly onClose: () => void;
}

/** Browser-only editorial presentation of Music data resolved from a canonical node identity. */
export function createMusicSelectionPanel(
    catalog: MusicCatalog,
    relationProvider: MusicSelectionRelationProvider,
    actions: MusicSelectionPanelActions
): MusicSelectionPanel {
    let entities = indexEntities(catalog);
    let currentRelationProvider = relationProvider;
    const element = document.createElement("aside");
    element.className = "selection-panel";
    element.hidden = true;
    element.setAttribute("aria-labelledby", "selection-panel-title");

    const closeButton = createCloseButton(() => close());
    const hide = (): void => {
        element.hidden = true;
        delete element.dataset.selectedId;
        delete element.dataset.entityKind;
        element.replaceChildren(closeButton);
    };
    const close = (): void => {
        hide();
        actions.onClose();
    };
    const selectRelation = (knowledgeNodeId: string): void => {
        show(knowledgeNodeId);
        actions.onRelationSelected(knowledgeNodeId);
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
            createConnections(currentRelationProvider(knowledgeNodeId), selectRelation)
        );
        element.hidden = false;
    };
    const updateSource = (
        updatedCatalog: MusicCatalog,
        updatedRelationProvider: MusicSelectionRelationProvider
    ): void => {
        entities = indexEntities(updatedCatalog);
        currentRelationProvider = updatedRelationProvider;
    };
    const getSelectedKnowledgeNodeId = (): string | undefined => element.dataset.selectedId;
    return Object.freeze({
        element,
        show,
        hide,
        close,
        updateSource,
        getSelectedKnowledgeNodeId,
    });
}

function indexEntities(catalog: MusicCatalog): Map<string, MusicEntity> {
    return new Map<string, MusicEntity>(
        catalog
            .getEntities()
            .map((entity) => [`music:${entity.kind}:${entity.id}`, entity] as const)
    );
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

function createConnections(
    relations: readonly MusicSelectionRelation[],
    select: (knowledgeNodeId: string) => void
): HTMLElement {
    const section = document.createElement("section");
    section.className = "selection-panel__connections";
    const heading = document.createElement("h3");
    heading.textContent = uiText.connections;
    section.append(heading);
    if (relations.length === 0) {
        const empty = document.createElement("p");
        empty.className = "selection-panel__connections-empty";
        empty.textContent = uiText.noConnections;
        section.append(empty);
        return section;
    }

    const list = document.createElement("ul");
    for (const relation of relations.slice(0, CONNECTION_DISPLAY_LIMIT)) {
        const item = document.createElement("li");
        item.append(createConnectionButton(relation, select));
        list.append(item);
    }
    section.append(list);
    const remaining = relations.length - CONNECTION_DISPLAY_LIMIT;
    if (remaining > 0) {
        const more = document.createElement("p");
        more.className = "selection-panel__connections-more";
        more.textContent = `+${remaining} ${uiText.moreConnections}`;
        section.append(more);
    }
    return section;
}

function createConnectionButton(
    relation: MusicSelectionRelation,
    select: (knowledgeNodeId: string) => void
): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selection-panel__connection";
    button.dataset.knowledgeNodeId = relation.knowledgeNodeId;
    const title = document.createElement("span");
    title.className = "selection-panel__connection-title";
    title.textContent = relation.entity.title ?? relation.entity.name ?? relation.entity.id;
    const kind = document.createElement("span");
    kind.className = "selection-panel__connection-kind";
    kind.textContent = uiText.entityKinds[relation.entity.kind];
    button.append(title, kind);
    button.addEventListener("click", () => select(relation.knowledgeNodeId));
    return button;
}
