import { clamp } from "../math";

import { CameraConfig } from "./CameraConfig";

export interface CameraPoint {
    readonly x: number;
    readonly y: number;
}

/**
 * Stateful, browser-independent transform centered on the camera position.
 * World and screen axes share the convention: positive x is right, positive y is down.
 */
export class Camera2D {
    private readonly config: CameraConfig;
    private positionX = 0;
    private positionY = 0;
    private zoom: number;
    private viewportWidth: number;
    private viewportHeight: number;

    public constructor(config: CameraConfig) {
        this.config = config;
        this.zoom = config.initialZoom;
        this.viewportWidth = config.viewportWidth;
        this.viewportHeight = config.viewportHeight;
    }

    public getPosition(): CameraPoint {
        return Camera2D.point(this.positionX, this.positionY);
    }

    public getZoom(): number {
        return this.zoom;
    }

    public setPosition(x: number, y: number): void {
        Camera2D.validateFinite(x, "x");
        Camera2D.validateFinite(y, "y");
        this.positionX = x;
        this.positionY = y;
    }

    public setZoom(zoom: number): void {
        Camera2D.validateFinite(zoom, "zoom");
        this.zoom = clamp(zoom, this.config.minZoom, this.config.maxZoom);
    }

    public pan(dx: number, dy: number): void {
        Camera2D.validateFinite(dx, "dx");
        Camera2D.validateFinite(dy, "dy");
        const nextX = this.positionX + dx;
        const nextY = this.positionY + dy;
        Camera2D.validateFinite(nextX, "resulting x position");
        Camera2D.validateFinite(nextY, "resulting y position");
        this.positionX = nextX;
        this.positionY = nextY;
    }

    public zoomAt(screenX: number, screenY: number, newZoom: number): void {
        Camera2D.validateFinite(screenX, "screenX");
        Camera2D.validateFinite(screenY, "screenY");
        Camera2D.validateFinite(newZoom, "newZoom");
        const worldPoint = this.screenToWorld(screenX, screenY);
        const clampedZoom = clamp(newZoom, this.config.minZoom, this.config.maxZoom);
        const nextX = worldPoint.x - (screenX - this.viewportWidth / 2) / clampedZoom;
        const nextY = worldPoint.y - (screenY - this.viewportHeight / 2) / clampedZoom;
        Camera2D.validateFinite(nextX, "resulting x position");
        Camera2D.validateFinite(nextY, "resulting y position");
        this.positionX = nextX;
        this.positionY = nextY;
        this.zoom = clampedZoom;
    }

    public worldToScreen(x: number, y: number): CameraPoint {
        Camera2D.validateFinite(x, "x");
        Camera2D.validateFinite(y, "y");
        const screenX = (x - this.positionX) * this.zoom + this.viewportWidth / 2;
        const screenY = (y - this.positionY) * this.zoom + this.viewportHeight / 2;
        Camera2D.validateFinite(screenX, "screen x");
        Camera2D.validateFinite(screenY, "screen y");
        return Camera2D.point(screenX, screenY);
    }

    public screenToWorld(x: number, y: number): CameraPoint {
        Camera2D.validateFinite(x, "x");
        Camera2D.validateFinite(y, "y");
        const worldX = this.positionX + (x - this.viewportWidth / 2) / this.zoom;
        const worldY = this.positionY + (y - this.viewportHeight / 2) / this.zoom;
        Camera2D.validateFinite(worldX, "world x");
        Camera2D.validateFinite(worldY, "world y");
        return Camera2D.point(worldX, worldY);
    }

    public setViewport(width: number, height: number): void {
        Camera2D.validatePositiveFinite(width, "width");
        Camera2D.validatePositiveFinite(height, "height");
        this.viewportWidth = width;
        this.viewportHeight = height;
    }

    private static point(x: number, y: number): CameraPoint {
        return Object.freeze({ x, y });
    }

    private static validateFinite(value: number, name: string): void {
        if (!Number.isFinite(value)) {
            throw new RangeError(`${name} must be finite.`);
        }
    }

    private static validatePositiveFinite(value: number, name: string): void {
        if (!Number.isFinite(value) || value <= 0) {
            throw new RangeError(`${name} must be finite and greater than zero.`);
        }
    }
}
