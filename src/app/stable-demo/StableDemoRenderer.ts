import { hashString, hashToFloat, mixUint32 } from "../../engine/math";

import type {
    StableDemoBuilding,
    StableDemoContinent,
    StableDemoDistrict,
    StableDemoSnapshot,
} from "./StableDemoModel";

export interface StableDemoRenderOptions {
    readonly snapshot: StableDemoSnapshot;
    readonly width: number;
    readonly height: number;
    readonly selectedFeatureId?: string;
    readonly onSelect: (featureId: string, knowledgeNodeId: string) => void;
}

/** Demo-owned illustrated translation of canonical semantic geography. */
export class StableDemoRenderer {
    public render(svg: SVGSVGElement, options: StableDemoRenderOptions): void {
        svg.replaceChildren();
        svg.setAttribute("viewBox", `0 0 ${options.width} ${options.height}`);
        svg.append(textureDefinitions(), paper(options.width, options.height), mapTexture(options));
        for (const continent of options.snapshot.continents) {
            this.continent(svg, continent, options);
        }
    }

    private continent(
        svg: SVGSVGElement,
        continent: StableDemoContinent,
        options: StableDemoRenderOptions
    ): void {
        const group = svgElement("g");
        group.classList.add("bridge-continent");
        group.dataset.genre = continent.name;
        group.dataset.featureId = continent.feature.id;
        select(group, continent.feature, continent.name, options);
        const shape = svgElement("path");
        shape.classList.add("bridge-continent__land", paletteClass(continent.feature.id));
        shape.setAttribute("d", organicPath(continent.bounds, continent.feature.id, 12, 0.1));
        group.append(shape);
        const title = text(continent.name, continent.bounds.x0 + 2, continent.bounds.y0 + 3.4);
        title.classList.add("bridge-continent__title");
        group.append(title);
        for (const district of options.snapshot.districts.filter(
            ({ feature }) => feature.parentId === continent.feature.id
        )) {
            this.district(group, district, options);
        }
        svg.append(group);
    }

    private district(
        parent: SVGGElement,
        district: StableDemoDistrict,
        options: StableDemoRenderOptions
    ): void {
        const group = svgElement("g");
        group.classList.add("bridge-district");
        if (district.isRuined) group.classList.add("bridge-district--ruined");
        if (district.feature.id === options.selectedFeatureId) {
            group.classList.add("bridge-feature--selected");
        }
        group.dataset.featureId = district.feature.id;
        group.dataset.ruined = String(district.isRuined);
        select(group, district.feature, district.name, options);
        const shape = svgElement("path");
        shape.classList.add("bridge-district__ground");
        shape.setAttribute(
            "d",
            organicPath(inset(district.bounds, 0.7, 3.4), district.feature.id, 8, 0.07)
        );
        group.append(shape, districtMotif(district));
        const label = text(
            district.name,
            district.bounds.x0 + 1.4,
            Math.min(district.bounds.y1 - 1.1, district.bounds.y0 + 5.2)
        );
        label.classList.add("bridge-district__title");
        group.append(label);
        for (const building of options.snapshot.buildings.filter(
            ({ feature }) => feature.parentId === district.feature.id
        )) {
            this.building(group, building, options);
        }
        parent.append(group);
    }

    private building(
        parent: SVGGElement,
        building: StableDemoBuilding,
        options: StableDemoRenderOptions
    ): void {
        const group = svgElement("g");
        group.classList.add("bridge-building");
        if (building.feature.id === options.selectedFeatureId) {
            group.classList.add("bridge-feature--selected");
        }
        group.dataset.featureId = building.feature.id;
        group.dataset.trackCount = String(building.tracks.length);
        select(group, building.feature, building.title, options);
        const { x, y } = building.position;
        const silhouette = svgElement("path");
        silhouette.classList.add("bridge-building__shape");
        silhouette.setAttribute(
            "d",
            `M ${x - 1.6} ${y + 1.2} L ${x - 1.6} ${y - 0.5} L ${x - 0.5} ${y - 1.7} L ${x + 0.2} ${y - 0.7} L ${x + 0.8} ${y - 2.2} L ${x + 1.5} ${y - 0.6} L ${x + 1.5} ${y + 1.2} Z`
        );
        const label = text(building.title, x, y + 2.6);
        label.classList.add("bridge-building__title");
        group.append(silhouette, label);
        parent.append(group);
    }
}

function districtMotif(district: StableDemoDistrict): SVGGElement {
    const group = svgElement("g");
    group.classList.add("bridge-district__motif");
    const hash = hashString(district.feature.id);
    const width = district.bounds.x1 - district.bounds.x0;
    const height = district.bounds.y1 - district.bounds.y0;
    const street = svgElement("path");
    street.classList.add("bridge-district__street");
    street.setAttribute(
        "d",
        `M ${district.bounds.x0 + 1} ${district.bounds.y1 - 1.1} Q ${district.bounds.x0 + width * 0.46} ${district.bounds.y0 + height * 0.64} ${district.bounds.x1 - 1} ${district.bounds.y1 - 1.4}`
    );
    group.append(street);
    const volumeCount = 3 + (hash % 4);
    for (let index = 0; index < volumeCount; index += 1) {
        const x = district.bounds.x0 + 1.2 + ((index + 1) * (width - 2.4)) / (volumeCount + 1);
        const baseY = district.bounds.y1 - 1.45 - (index % 2) * 0.35;
        const volumeHeight = 0.9 + hashToFloat(mixUint32(hash, index)) * 1.8;
        const volumeWidth = 0.55 + hashToFloat(mixUint32(hash, index + 11)) * 0.6;
        const building = svgElement("path");
        building.classList.add("bridge-district__decoration");
        building.setAttribute(
            "d",
            decorativeBuildingPath(x, baseY, volumeWidth, volumeHeight, mixUint32(hash, index + 23))
        );
        group.append(building);
    }
    return group;
}

function decorativeBuildingPath(
    x: number,
    baseY: number,
    width: number,
    height: number,
    hash: number
): string {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = baseY - height;
    const roofKind = hash % 3;
    if (roofKind === 0) {
        return `M ${left} ${baseY} L ${left} ${top + 0.35} L ${x} ${top} L ${right} ${top + 0.35} L ${right} ${baseY} Z`;
    }
    if (roofKind === 1) {
        return `M ${left} ${baseY} L ${left} ${top + 0.25} Q ${x} ${top - 0.4} ${right} ${top + 0.25} L ${right} ${baseY} Z`;
    }
    return `M ${left} ${baseY} L ${left} ${top} L ${x - 0.1} ${top} L ${x} ${top - 0.55} L ${x + 0.1} ${top} L ${right} ${top} L ${right} ${baseY} Z`;
}

function organicPath(
    bounds: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number },
    id: string,
    pointCount: number,
    variation: number
): string {
    const centerX = (bounds.x0 + bounds.x1) / 2;
    const centerY = (bounds.y0 + bounds.y1) / 2;
    const radiusX = (bounds.x1 - bounds.x0) / 2;
    const radiusY = (bounds.y1 - bounds.y0) / 2;
    const hash = hashString(id);
    const points = Array.from({ length: pointCount }, (_, index) => {
        const angleJitter =
            (hashToFloat(mixUint32(hash, index + 101)) - 0.5) * (Math.PI / pointCount) * 0.65;
        const angle = (Math.PI * 2 * index) / pointCount + angleJitter;
        const localVariation = hashToFloat(mixUint32(hash, index));
        const concavity = index % 3 === hash % 3 ? 0.7 + localVariation * 0.08 : 0.88;
        const scale = concavity + localVariation * variation;
        return {
            x: centerX + Math.cos(angle) * radiusX * scale,
            y: centerY + Math.sin(angle) * radiusY * scale,
        };
    });
    const midpoint = (index: number): { readonly x: number; readonly y: number } => {
        const left = points[index % points.length];
        const right = points[(index + 1) % points.length];
        if (left === undefined || right === undefined)
            throw new Error("Organic path requires points.");
        return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    };
    const start = midpoint(points.length - 1);
    const commands = [`M ${start.x} ${start.y}`];
    points.forEach((point, index) => {
        const next = midpoint(index);
        commands.push(`Q ${point.x} ${point.y} ${next.x} ${next.y}`);
    });
    return `${commands.join(" ")} Z`;
}

function inset(
    bounds: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number },
    horizontal: number,
    top: number
): { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number } {
    return {
        x0: bounds.x0 + horizontal,
        y0: bounds.y0 + Math.min(top, (bounds.y1 - bounds.y0) * 0.28),
        x1: bounds.x1 - horizontal,
        y1: bounds.y1 - 0.6,
    };
}

function select(
    element: SVGElement,
    feature: { readonly id: string; readonly sourceKnowledgeNodeId?: string },
    label: string,
    options: StableDemoRenderOptions
): void {
    if (feature.sourceKnowledgeNodeId === undefined) return;
    element.classList.add("bridge-selectable");
    element.dataset.knowledgeNodeId = feature.sourceKnowledgeNodeId;
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", label);
    const activate = (event: Event): void => {
        event.stopPropagation();
        options.onSelect(feature.id, feature.sourceKnowledgeNodeId ?? "");
    };
    element.addEventListener("click", activate);
    element.addEventListener("keydown", (event) => {
        if (!(event instanceof KeyboardEvent) || (event.key !== "Enter" && event.key !== " ")) {
            return;
        }
        event.preventDefault();
        activate(event);
    });
}

function paletteClass(id: string): string {
    return `bridge-palette-${hashString(id) % 5}`;
}

function paper(width: number, height: number): SVGRectElement {
    const element = svgElement("rect");
    element.classList.add("bridge-paper");
    element.setAttribute("width", String(width));
    element.setAttribute("height", String(height));
    return element;
}

function textureDefinitions(): SVGDefsElement {
    const definitions = svgElement("defs");
    const pattern = svgElement("pattern");
    pattern.id = "bridge-map-texture";
    pattern.setAttribute("width", "7");
    pattern.setAttribute("height", "5");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    const line = svgElement("path");
    line.setAttribute("d", "M 0 1.2 Q 1.8 0.8 3.5 1.3 T 7 1.2 M 1 4 Q 3 3.5 5.5 4");
    line.classList.add("bridge-map-texture__line");
    const mark = svgElement("circle");
    mark.setAttribute("cx", "6.1");
    mark.setAttribute("cy", "3.1");
    mark.setAttribute("r", "0.12");
    mark.classList.add("bridge-map-texture__mark");
    pattern.append(line, mark);
    definitions.append(pattern);
    return definitions;
}

function mapTexture(options: Pick<StableDemoRenderOptions, "width" | "height">): SVGRectElement {
    const element = svgElement("rect");
    element.classList.add("bridge-map-texture");
    element.setAttribute("width", String(options.width));
    element.setAttribute("height", String(options.height));
    return element;
}

function text(value: string, x: number, y: number): SVGTextElement {
    const element = svgElement("text");
    element.textContent = value;
    element.setAttribute("x", String(x));
    element.setAttribute("y", String(y));
    return element;
}

function svgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
}
