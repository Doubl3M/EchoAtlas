import type { RenderSurface } from "./RenderSurface";
import type { LabelVisualStyle } from "./VisualTheme";

export interface LabelDescriptor {
    readonly text: string;
    readonly priority: number;
    readonly minZoom: number;
    readonly landmarkKind?: LandmarkKind;
    /** Generic editorial treatment; its domain meaning remains owned by the caller. */
    readonly presentationTone?: LabelPresentationTone;
}

export type LandmarkKind = "city";
export type LabelPresentationTone = "normal" | "weathered";

export interface LabelCandidate {
    readonly knowledgeNodeId: string;
    readonly descriptor: LabelDescriptor;
    readonly markerX: number;
    readonly markerY: number;
    readonly markerClearance?: number;
}

export interface ScreenBounds {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
}

export interface PositionedLabel {
    readonly knowledgeNodeId: string;
    readonly descriptor: LabelDescriptor;
    readonly x: number;
    readonly y: number;
}

interface LabelRectangle extends ScreenBounds {
    readonly positioned: PositionedLabel;
}

/** Deterministic first-pass label decluttering in screen space. */
export function layoutLabels(
    candidates: readonly LabelCandidate[],
    style: LabelVisualStyle,
    bounds: ScreenBounds,
    surface: RenderSurface
): readonly PositionedLabel[] {
    const accepted: LabelRectangle[] = [];
    const ordered = [...candidates].sort((left, right) => {
        const priority = right.descriptor.priority - left.descriptor.priority;
        if (priority !== 0) {
            return priority;
        }
        return lexicalCompare(left.knowledgeNodeId, right.knowledgeNodeId);
    });
    for (const candidate of ordered) {
        const font =
            candidate.descriptor.presentationTone === "weathered"
                ? style.weathered.font
                : style.font;
        const metrics = surface.measureText(candidate.descriptor.text, font);
        for (const rectangle of placements(candidate, metrics, style)) {
            if (
                isInside(rectangle, bounds) &&
                accepted.every((value) => !overlaps(rectangle, value, style.collisionPadding))
            ) {
                accepted.push(rectangle);
                break;
            }
        }
    }
    return Object.freeze(accepted.map(({ positioned }) => Object.freeze(positioned)));
}

function placements(
    candidate: LabelCandidate,
    metrics: { readonly width: number; readonly ascent: number; readonly descent: number },
    style: LabelVisualStyle
): readonly LabelRectangle[] {
    const clearance = candidate.markerClearance ?? 0;
    const horizontalOffset = Math.max(style.offsetX, clearance);
    const verticalOffset = Math.max(Math.abs(style.offsetY), clearance);
    const rightX = candidate.markerX + horizontalOffset;
    const leftX = candidate.markerX - horizontalOffset - metrics.width;
    const upperY = candidate.markerY - verticalOffset;
    const lowerY = candidate.markerY + verticalOffset + metrics.ascent;
    return [
        rectangle(candidate.knowledgeNodeId, candidate.descriptor, rightX, upperY, metrics),
        rectangle(candidate.knowledgeNodeId, candidate.descriptor, leftX, upperY, metrics),
        rectangle(candidate.knowledgeNodeId, candidate.descriptor, rightX, lowerY, metrics),
        rectangle(candidate.knowledgeNodeId, candidate.descriptor, leftX, lowerY, metrics),
    ];
}

function rectangle(
    knowledgeNodeId: string,
    descriptor: LabelDescriptor,
    x: number,
    y: number,
    metrics: { readonly width: number; readonly ascent: number; readonly descent: number }
): LabelRectangle {
    return {
        left: x,
        top: y - metrics.ascent,
        right: x + metrics.width,
        bottom: y + metrics.descent,
        positioned: { knowledgeNodeId, descriptor, x, y },
    };
}

function isInside(value: ScreenBounds, bounds: ScreenBounds): boolean {
    return (
        value.left >= bounds.left &&
        value.top >= bounds.top &&
        value.right <= bounds.right &&
        value.bottom <= bounds.bottom
    );
}

function overlaps(left: ScreenBounds, right: ScreenBounds, padding: number): boolean {
    return !(
        left.right + padding <= right.left ||
        left.left >= right.right + padding ||
        left.bottom + padding <= right.top ||
        left.top >= right.bottom + padding
    );
}

function lexicalCompare(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
