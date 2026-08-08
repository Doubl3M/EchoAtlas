import type { RenderSurface } from "../src/render";

export interface RenderCommandCounts {
    readonly rectangles: number;
    readonly lines: number;
    readonly circles: number;
    readonly labels: number;
}

/** In-memory surface measuring Renderer traversal without pretending to time browser painting. */
export class CountingRenderSurface implements RenderSurface {
    public readonly width: number;
    public readonly height: number;
    private rectangles = 0;
    private lines = 0;
    private circles = 0;
    private labels = 0;

    public constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    public fillRect(): void {
        this.rectangles += 1;
    }

    public strokeLine(): void {
        this.lines += 1;
    }

    public strokeQuadraticCurve(): void {
        this.lines += 1;
    }

    public fillCircle(): void {
        this.circles += 1;
    }

    public fillText(): void {
        this.labels += 1;
    }

    public measureText(text: string): { width: number; ascent: number; descent: number } {
        return { width: text.length * 7, ascent: 10, descent: 3 };
    }

    public getCounts(): RenderCommandCounts {
        return Object.freeze({
            rectangles: this.rectangles,
            lines: this.lines,
            circles: this.circles,
            labels: this.labels,
        });
    }
}
