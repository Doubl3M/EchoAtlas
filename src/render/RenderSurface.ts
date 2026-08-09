export interface RenderSurface {
    readonly width: number;
    readonly height: number;

    fillRect(x: number, y: number, width: number, height: number, color: string): void;

    drawRaster(raster: RenderRaster, x: number, y: number, width: number, height: number): void;

    strokeLine(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        color: string,
        width: number,
        opacity: number
    ): void;

    strokeQuadraticCurve(
        startX: number,
        startY: number,
        controlX: number,
        controlY: number,
        endX: number,
        endY: number,
        color: string,
        width: number,
        opacity: number
    ): void;

    fillCircle(
        x: number,
        y: number,
        radius: number,
        fillColor: string,
        strokeColor: string,
        strokeWidth: number
    ): void;

    fillText(
        text: string,
        x: number,
        y: number,
        color: string,
        font: string,
        haloColor: string,
        haloWidth: number
    ): void;

    measureText(text: string, font: string): RenderTextMetrics;
}

export interface RenderRaster {
    readonly width: number;
    readonly height: number;
    readonly colors: readonly string[];
}

export interface RenderTextMetrics {
    readonly width: number;
    readonly ascent: number;
    readonly descent: number;
}
