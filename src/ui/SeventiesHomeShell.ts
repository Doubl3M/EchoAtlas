export interface SeventiesHomeShellText {
    readonly title: string;
    readonly subtitle: string;
    readonly explorer: string;
    readonly navigationLabel: string;
    readonly zoomIn: string;
    readonly zoomOut: string;
    readonly recenter: string;
    readonly journey: string;
    readonly places: string;
    readonly relations: string;
    readonly visible: string;
    readonly navigationHelp: string;
}

export interface SeventiesHomeShellOptions {
    readonly canvas: HTMLCanvasElement;
    readonly selectionPanels: readonly HTMLElement[];
    readonly mapOverlays?: readonly HTMLElement[];
    readonly text: SeventiesHomeShellText;
    readonly locationCount: number;
    readonly relationCount: number;
    readonly journeyControl?: HTMLElement;
    readonly onZoomIn: () => void;
    readonly onZoomOut: () => void;
    readonly onRecenter: () => void;
}

export interface SeventiesHomeShell {
    readonly element: HTMLElement;
    readonly mapViewport: HTMLElement;
    setVisibleLocationCount(count: number): void;
    setLocationCount(count: number): void;
    setRelationCount(count: number): void;
}

/** Theme-specific browser shell. It receives generic map facts and actions only. */
export function createSeventiesHomeShell(options: SeventiesHomeShellOptions): SeventiesHomeShell {
    const element = document.createElement("div");
    element.className = "atlas-shell";
    const brand = createBrand(options.text);
    const navigation = createNavigation(options.text);
    const map = createMap(options);
    const journey = createJourney(options);
    const exploration = document.createElement("main");
    exploration.className = "atlas-exploration";
    exploration.append(map.frame, ...options.selectionPanels);
    element.append(brand, navigation, exploration, journey.element);

    return Object.freeze({
        element,
        mapViewport: map.viewport,
        setVisibleLocationCount(count: number): void {
            journey.visible.textContent = String(count);
        },
        setLocationCount(count: number): void {
            journey.locations.textContent = String(count);
        },
        setRelationCount(count: number): void {
            journey.relations.textContent = String(count);
        },
    });
}

function createBrand(text: SeventiesHomeShellText): HTMLElement {
    const brand = document.createElement("header");
    brand.className = "atlas-brand";
    const emblem = document.createElement("span");
    emblem.className = "atlas-brand__emblem";
    emblem.setAttribute("aria-hidden", "true");
    emblem.textContent = "✦";
    const copy = document.createElement("div");
    const title = document.createElement("h1");
    title.textContent = text.title;
    const subtitle = document.createElement("p");
    subtitle.textContent = text.subtitle;
    copy.append(title, subtitle);
    brand.append(emblem, copy);
    return brand;
}

function createNavigation(text: SeventiesHomeShellText): HTMLElement {
    const navigation = document.createElement("nav");
    navigation.className = "atlas-navigation";
    navigation.setAttribute("aria-label", text.navigationLabel);
    const explorer = document.createElement("button");
    explorer.type = "button";
    explorer.className = "atlas-navigation__item atlas-navigation__item--active";
    explorer.setAttribute("aria-current", "page");
    explorer.innerHTML = '<span aria-hidden="true">⌖</span>';
    const label = document.createElement("span");
    label.textContent = text.explorer;
    explorer.append(label);
    navigation.append(explorer);
    return navigation;
}

function createMap(options: SeventiesHomeShellOptions): {
    readonly frame: HTMLElement;
    readonly viewport: HTMLElement;
} {
    const frame = document.createElement("section");
    frame.className = "atlas-map";
    const viewport = document.createElement("div");
    viewport.className = "atlas-map__viewport";
    const controls = document.createElement("div");
    controls.className = "atlas-map__controls";
    controls.append(
        createControl("+", options.text.zoomIn, options.onZoomIn),
        createControl("−", options.text.zoomOut, options.onZoomOut),
        createControl("N", options.text.recenter, options.onRecenter, "atlas-compass")
    );
    const help = document.createElement("p");
    help.className = "atlas-map__help";
    help.textContent = options.text.navigationHelp;
    viewport.append(options.canvas, ...(options.mapOverlays ?? []), controls, help);
    frame.append(viewport);
    return { frame, viewport };
}

function createControl(
    symbol: string,
    label: string,
    action: () => void,
    className = ""
): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `atlas-map__control ${className}`.trim();
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    button.addEventListener("click", action);
    return button;
}

function createJourney(options: SeventiesHomeShellOptions): {
    readonly element: HTMLElement;
    readonly visible: HTMLElement;
    readonly locations: HTMLElement;
    readonly relations: HTMLElement;
} {
    const element = document.createElement("footer");
    element.className = "atlas-journey";
    const title = document.createElement("p");
    title.className = "atlas-journey__title";
    title.textContent = options.text.journey;
    const facts = document.createElement("dl");
    const locations = document.createElement("dd");
    const relations = document.createElement("dd");
    const visible = document.createElement("dd");
    locations.className = "atlas-journey__locations";
    relations.className = "atlas-journey__relations";
    visible.className = "atlas-journey__visible";
    locations.textContent = String(options.locationCount);
    relations.textContent = String(options.relationCount);
    appendFact(facts, options.text.places, locations);
    appendFact(facts, options.text.relations, relations);
    appendFact(facts, options.text.visible, visible);
    element.append(
        title,
        facts,
        ...(options.journeyControl === undefined ? [] : [options.journeyControl])
    );
    return { element, visible, locations, relations };
}

function appendFact(list: HTMLElement, label: string, value: string | HTMLElement): void {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = typeof value === "string" ? document.createElement("dd") : value;
    if (typeof value === "string") {
        description.textContent = value;
    }
    list.append(term, description);
}
