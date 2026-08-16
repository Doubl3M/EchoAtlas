import { hashString, hashToFloat, mixUint32 } from "../../src/engine/math";
import type {
    GeographicAppearanceSnapshot,
    GeographicBounds,
    GeographicFeature,
    GeographicHierarchy,
    GeographicLayout,
} from "../../src/world";

export type SemanticPreviewLabelProvider = (knowledgeNodeId: string) => string | undefined;

export interface SemanticAtlasPreviewRenderOptions {
    readonly hierarchy: GeographicHierarchy;
    readonly layout: GeographicLayout;
    readonly appearance: GeographicAppearanceSnapshot;
    readonly labels: SemanticPreviewLabelProvider;
    readonly selectedKnowledgeNodeId?: string;
    readonly debugBounds?: boolean;
    readonly onSelect: (knowledgeNodeId: string) => void;
}

/** Isolated product preview for generic hierarchy/layout/appearance snapshots. */
export class SemanticAtlasPreviewRenderer {
    public render(svg: SVGSVGElement, options: SemanticAtlasPreviewRenderOptions): void {
        svg.replaceChildren();
        svg.setAttribute("viewBox", `0 0 ${options.layout.width} ${options.layout.height}`);
        svg.append(this.paper(options.layout.width, options.layout.height));

        for (const continent of options.hierarchy
            .getFeatures()
            .filter(({ role }) => role === "continent")) {
            this.renderContinent(svg, continent, options);
        }
    }

    private renderContinent(
        svg: SVGSVGElement,
        continent: GeographicFeature,
        options: SemanticAtlasPreviewRenderOptions
    ): void {
        const placement = options.layout.getRegionPlacementByFeatureId(continent.id);
        if (placement === undefined) return;
        const group = svgElement("g");
        group.classList.add("semantic-continent");
        group.dataset.featureId = continent.id;
        this.makeSelectable(group, continent.sourceKnowledgeNodeId, options);
        const shape = svgElement("path");
        shape.setAttribute("d", organicRegionPath(placement.bounds, continent.id, 0.7));
        shape.classList.add("semantic-continent__shape");
        group.append(shape);
        if (options.debugBounds) group.append(debugRectangle(placement.bounds));
        for (const district of options.hierarchy.getChildren(continent.id)) {
            this.renderDistrict(group, district, options);
        }
        group.append(
            labelText(
                options.labels(continent.sourceKnowledgeNodeId ?? "") ?? continent.id,
                placement.bounds.x0 + 1.8,
                placement.bounds.y0 + 2.8,
                "semantic-continent__label"
            )
        );
        svg.append(group);
    }

    private renderDistrict(
        parent: SVGGElement,
        district: GeographicFeature,
        options: SemanticAtlasPreviewRenderOptions
    ): void {
        const placement = options.layout.getRegionPlacementByFeatureId(district.id);
        if (placement === undefined) return;
        const group = svgElement("g");
        group.classList.add("semantic-district");
        if (options.appearance.getAppearance(district.id)?.condition === "ruined") {
            group.classList.add("semantic-district--ruined");
        }
        group.dataset.featureId = district.id;
        this.makeSelectable(group, district.sourceKnowledgeNodeId, options);
        const shape = svgElement("path");
        shape.setAttribute(
            "d",
            organicRegionPath(insetDistrict(placement.bounds), district.id, 0.35)
        );
        shape.classList.add("semantic-district__shape");
        group.append(shape);
        if (options.debugBounds) group.append(debugRectangle(placement.bounds));
        group.append(
            labelText(
                options.labels(district.sourceKnowledgeNodeId ?? "") ?? district.id,
                placement.bounds.x0 + 1.4,
                placement.bounds.y0 + 5.1,
                "semantic-district__label"
            )
        );
        for (const building of options.hierarchy.getChildren(district.id)) {
            this.renderBuilding(group, building, options);
        }
        parent.append(group);
    }

    private renderBuilding(
        parent: SVGGElement,
        building: GeographicFeature,
        options: SemanticAtlasPreviewRenderOptions
    ): void {
        const placement = options.layout.getSitePlacementByFeatureId(building.id);
        if (placement === undefined) return;
        const group = svgElement("g");
        group.classList.add("semantic-building");
        group.dataset.featureId = building.id;
        this.makeSelectable(group, building.sourceKnowledgeNodeId, options);
        const base = svgElement("path");
        const { x, y } = placement.position;
        base.setAttribute(
            "d",
            `M ${x - 1.3} ${y + 1} L ${x - 1.3} ${y - 0.6} L ${x} ${y - 1.8} L ${x + 1.3} ${y - 0.6} L ${x + 1.3} ${y + 1} Z`
        );
        base.classList.add("semantic-building__shape");
        group.append(base);
        group.append(
            labelText(
                options.labels(building.sourceKnowledgeNodeId ?? "") ?? building.id,
                x,
                y + 2.4,
                "semantic-building__label"
            )
        );
        const contents = options.hierarchy.getContentsByContainerId(building.id);
        contents.forEach((content, index) => {
            const marker = svgElement("circle");
            marker.classList.add("semantic-content");
            marker.setAttribute("cx", String(x - (contents.length - 1) * 0.38 + index * 0.76));
            marker.setAttribute("cy", String(y + 0.45));
            marker.setAttribute("r", "0.26");
            this.makeSelectable(marker, content.knowledgeNodeId, options);
            marker.dataset.contentId = content.id;
            group.append(marker);
        });
        parent.append(group);
    }

    private makeSelectable(
        element: SVGElement,
        knowledgeNodeId: string | undefined,
        options: SemanticAtlasPreviewRenderOptions
    ): void {
        if (knowledgeNodeId === undefined) return;
        element.dataset.knowledgeNodeId = knowledgeNodeId;
        element.classList.add("semantic-selectable");
        if (knowledgeNodeId === options.selectedKnowledgeNodeId) {
            element.classList.add("semantic-selected");
        }
        element.addEventListener("click", (event) => {
            event.stopPropagation();
            options.onSelect(knowledgeNodeId);
        });
    }

    private paper(width: number, height: number): SVGRectElement {
        const rect = svgElement("rect");
        rect.setAttribute("width", String(width));
        rect.setAttribute("height", String(height));
        rect.classList.add("semantic-paper");
        return rect;
    }
}

function organicRegionPath(bounds: GeographicBounds, id: string, variation: number): string {
    const hash = hashString(id);
    const width = bounds.x1 - bounds.x0;
    const height = bounds.y1 - bounds.y0;
    const bendX = width * (0.08 + hashToFloat(mixUint32(hash, 1)) * variation * 0.08);
    const bendY = height * (0.08 + hashToFloat(mixUint32(hash, 2)) * variation * 0.08);
    const midX = (bounds.x0 + bounds.x1) / 2;
    const midY = (bounds.y0 + bounds.y1) / 2;
    return [
        `M ${bounds.x0 + bendX} ${bounds.y0}`,
        `Q ${midX} ${bounds.y0 + bendY} ${bounds.x1 - bendX} ${bounds.y0}`,
        `Q ${bounds.x1} ${bounds.y0} ${bounds.x1} ${bounds.y0 + bendY}`,
        `Q ${bounds.x1 - bendX} ${midY} ${bounds.x1} ${bounds.y1 - bendY}`,
        `Q ${bounds.x1} ${bounds.y1} ${bounds.x1 - bendX} ${bounds.y1}`,
        `Q ${midX} ${bounds.y1 - bendY} ${bounds.x0 + bendX} ${bounds.y1}`,
        `Q ${bounds.x0} ${bounds.y1} ${bounds.x0} ${bounds.y1 - bendY}`,
        `Q ${bounds.x0 + bendX} ${midY} ${bounds.x0} ${bounds.y0 + bendY}`,
        `Q ${bounds.x0} ${bounds.y0} ${bounds.x0 + bendX} ${bounds.y0}`,
        "Z",
    ].join(" ");
}

function insetDistrict(bounds: GeographicBounds): GeographicBounds {
    const horizontal = Math.min(0.65, (bounds.x1 - bounds.x0) * 0.12);
    const top = Math.min(3.5, (bounds.y1 - bounds.y0) * 0.2);
    const bottom = Math.min(0.65, (bounds.y1 - bounds.y0) * 0.12);
    return {
        x0: bounds.x0 + horizontal,
        y0: bounds.y0 + top,
        x1: bounds.x1 - horizontal,
        y1: bounds.y1 - bottom,
    };
}

function debugRectangle(bounds: GeographicBounds): SVGRectElement {
    const rect = svgElement("rect");
    rect.classList.add("semantic-debug-bounds");
    rect.setAttribute("x", String(bounds.x0));
    rect.setAttribute("y", String(bounds.y0));
    rect.setAttribute("width", String(bounds.x1 - bounds.x0));
    rect.setAttribute("height", String(bounds.y1 - bounds.y0));
    return rect;
}

function labelText(text: string, x: number, y: number, className: string): SVGTextElement {
    const label = svgElement("text");
    label.classList.add(className);
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(y));
    label.textContent = text;
    return label;
}

function svgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
}
