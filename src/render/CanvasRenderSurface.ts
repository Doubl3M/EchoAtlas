import type { RenderRaster, RenderSurface } from "./RenderSurface";

/** Browser adapter from the minimal RenderSurface contract to a Canvas 2D context. */
export class CanvasRenderSurface implements RenderSurface {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private cssWidth = 1;
    private cssHeight = 1;
    private readonly rasterCanvases = new WeakMap<RenderRaster, HTMLCanvasElement>();

    public constructor(canvas: HTMLCanvasElement) {
        const context = canvas.getContext("2d");
        if (context === null) {
            throw new Error("Canvas 2D context is unavailable.");
        }
        this.canvas = canvas;
        this.context = context;
    }

    public get width(): number {
        return this.cssWidth;
    }

    public get height(): number {
        return this.cssHeight;
    }

    public resize(width: number, height: number, devicePixelRatio: number): void {
        CanvasRenderSurface.validatePositiveFinite(width, "width");
        CanvasRenderSurface.validatePositiveFinite(height, "height");
        CanvasRenderSurface.validatePositiveFinite(devicePixelRatio, "devicePixelRatio");
        const backingWidth = Math.max(1, Math.round(width * devicePixelRatio));
        const backingHeight = Math.max(1, Math.round(height * devicePixelRatio));

        if (!Number.isSafeInteger(backingWidth) || !Number.isSafeInteger(backingHeight)) {
            throw new RangeError("Canvas backing-store dimensions must be safe integers.");
        }

        this.cssWidth = width;
        this.cssHeight = height;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.canvas.width = backingWidth;
        this.canvas.height = backingHeight;
        this.context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    public fillRect(x: number, y: number, width: number, height: number, color: string): void {
        this.context.save();
        this.context.fillStyle = color;
        this.context.fillRect(x, y, width, height);
        this.context.restore();
    }

    public drawRaster(
        raster: RenderRaster,
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        let source = this.rasterCanvases.get(raster);
        if (source === undefined) {
            source = document.createElement("canvas");
            source.width = raster.width;
            source.height = raster.height;
            const context = source.getContext("2d");
            if (context === null) {
                throw new Error("Terrain raster Canvas 2D context is unavailable.");
            }
            for (let index = 0; index < raster.colors.length; index += 1) {
                context.fillStyle = raster.colors[index] ?? "transparent";
                context.fillRect(index % raster.width, Math.floor(index / raster.width), 1, 1);
            }
            this.rasterCanvases.set(raster, source);
        }
        this.context.save();
        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = "high";
        this.context.drawImage(source, x, y, width, height);
        this.context.restore();
    }

    public strokeLine(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        color: string,
        width: number,
        opacity: number
    ): void {
        this.context.save();
        this.context.strokeStyle = color;
        this.context.lineWidth = width;
        this.context.globalAlpha = opacity;
        this.context.beginPath();
        this.context.moveTo(startX, startY);
        this.context.lineTo(endX, endY);
        this.context.stroke();
        this.context.restore();
    }

    public strokeQuadraticCurve(
        startX: number,
        startY: number,
        controlX: number,
        controlY: number,
        endX: number,
        endY: number,
        color: string,
        width: number,
        opacity: number
    ): void {
        this.context.save();
        this.context.strokeStyle = color;
        this.context.lineWidth = width;
        this.context.globalAlpha = opacity;
        this.context.lineCap = "round";
        this.context.beginPath();
        this.context.moveTo(startX, startY);
        this.context.quadraticCurveTo(controlX, controlY, endX, endY);
        this.context.stroke();
        this.context.restore();
    }

    public fillCircle(
        x: number,
        y: number,
        radius: number,
        fillColor: string,
        strokeColor: string,
        strokeWidth: number
    ): void {
        this.context.save();
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        this.context.fillStyle = fillColor;
        this.context.fill();
        this.context.strokeStyle = strokeColor;
        this.context.lineWidth = strokeWidth;
        this.context.stroke();
        this.context.restore();
    }

    public measureText(
        text: string,
        font: string
    ): {
        readonly width: number;
        readonly ascent: number;
        readonly descent: number;
    } {
        this.context.save();
        this.context.font = font;
        const metrics = this.context.measureText(text);
        this.context.restore();
        return Object.freeze({
            width: metrics.width,
            ascent: metrics.actualBoundingBoxAscent,
            descent: metrics.actualBoundingBoxDescent,
        });
    }

    public fillText(
        text: string,
        x: number,
        y: number,
        color: string,
        font: string,
        haloColor: string,
        haloWidth: number
    ): void {
        this.context.save();
        this.context.font = font;
        this.context.textAlign = "start";
        this.context.textBaseline = "alphabetic";
        if (haloWidth > 0) {
            this.context.strokeStyle = haloColor;
            this.context.lineWidth = haloWidth;
            this.context.lineJoin = "round";
            this.context.strokeText(text, x, y);
        }
        this.context.fillStyle = color;
        this.context.fillText(text, x, y);
        this.context.restore();
    }

    private static validatePositiveFinite(value: number, name: string): void {
        if (!Number.isFinite(value) || value <= 0) {
            throw new RangeError(`${name} must be finite and greater than zero.`);
        }
    }
}
