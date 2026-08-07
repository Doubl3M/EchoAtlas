export interface RenderSurface {
    readonly width: number;
    readonly height: number;

    fillRect(x: number, y: number, width: number, height: number, color: string): void;

    strokeLine(
        startX: number,
        startY: number,
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

    fillText(text: string, x: number, y: number, color: string, font: string): void;
}
