import type { CurrentBroadcast } from "./CurrentBroadcast";
import { uiText } from "./UiText";

export interface CurrentBroadcastPanel {
    readonly element: HTMLElement;
    show(): void;
    hide(): void;
    close(): void;
}

/** Accessible browser presentation of the current broadcast snapshot. */
export function createCurrentBroadcastPanel(
    broadcast: CurrentBroadcast,
    onClose: () => void
): CurrentBroadcastPanel {
    const element = document.createElement("aside");
    element.className = "selection-panel selection-panel--broadcast";
    element.hidden = true;
    element.dataset.panelKind = "current-broadcast";
    element.setAttribute("aria-labelledby", "broadcast-panel-title");
    const closeButton = createCloseButton(() => close());
    const hide = (): void => {
        element.hidden = true;
    };
    const close = (): void => {
        hide();
        onClose();
    };
    const show = (): void => {
        element.replaceChildren(
            closeButton,
            createHeader(),
            createSignalMotif(),
            createPlaylist(broadcast)
        );
        element.hidden = false;
    };
    return Object.freeze({ element, show, hide, close });
}

function createCloseButton(close: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selection-panel__close";
    button.setAttribute("aria-label", uiText.closeBroadcast);
    button.textContent = uiText.closeSymbol;
    button.addEventListener("click", close);
    return button;
}

function createHeader(): HTMLElement {
    const header = document.createElement("header");
    header.className = "selection-panel__header broadcast-panel__header";
    const kind = document.createElement("p");
    kind.className = "selection-panel__kind";
    kind.textContent = uiText.currentBroadcastKind;
    const title = document.createElement("h2");
    title.id = "broadcast-panel-title";
    title.textContent = uiText.pirateRadio;
    const description = document.createElement("p");
    description.className = "broadcast-panel__description";
    description.textContent = uiText.currentListening;
    header.append(kind, title, description);
    return header;
}

function createSignalMotif(): HTMLElement {
    const motif = document.createElement("div");
    motif.className = "broadcast-panel__signal";
    motif.setAttribute("aria-hidden", "true");
    motif.append(document.createElement("span"), document.createElement("span"));
    return motif;
}

function createPlaylist(broadcast: CurrentBroadcast): HTMLElement {
    const section = document.createElement("section");
    section.className = "broadcast-panel__playlist";
    const heading = document.createElement("h3");
    heading.textContent = uiText.broadcastPlaylist;
    const list = document.createElement("ol");
    const currentId = broadcast.getCurrentEntry()?.id;
    for (const entry of broadcast.getEntries()) {
        const item = document.createElement("li");
        item.dataset.broadcastEntryId = entry.id;
        if (entry.id === currentId) item.setAttribute("aria-current", "true");
        const track = document.createElement("strong");
        track.textContent = entry.trackTitle;
        const artist = document.createElement("span");
        artist.textContent = entry.artistName;
        item.append(track, artist);
        if (entry.id === currentId) {
            const current = document.createElement("em");
            current.textContent = uiText.broadcastingNow;
            item.append(current);
        }
        list.append(item);
    }
    section.append(heading, list);
    return section;
}
