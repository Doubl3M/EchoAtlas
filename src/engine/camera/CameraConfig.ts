export interface CameraConfigOptions {
    /** Positive finite abstract viewport width; it is not a Canvas backing-store size. */
    readonly viewportWidth: number;
    /** Positive finite abstract viewport height; it is not a Canvas backing-store size. */
    readonly viewportHeight: number;
    readonly minZoom: number;
    readonly maxZoom: number;
    readonly initialZoom: number;
}

/** Immutable initial constraints for a two-dimensional camera. */
export class CameraConfig {
    public readonly viewportWidth: number;
    public readonly viewportHeight: number;
    public readonly minZoom: number;
    public readonly maxZoom: number;
    public readonly initialZoom: number;

    public constructor(options: CameraConfigOptions) {
        CameraConfig.validatePositiveFinite(options.viewportWidth, "viewportWidth");
        CameraConfig.validatePositiveFinite(options.viewportHeight, "viewportHeight");
        CameraConfig.validatePositiveFinite(options.minZoom, "minZoom");
        CameraConfig.validatePositiveFinite(options.maxZoom, "maxZoom");
        CameraConfig.validatePositiveFinite(options.initialZoom, "initialZoom");

        if (options.minZoom > options.maxZoom) {
            throw new RangeError("minZoom must be less than or equal to maxZoom.");
        }

        if (options.initialZoom < options.minZoom || options.initialZoom > options.maxZoom) {
            throw new RangeError("initialZoom must be in [minZoom, maxZoom].");
        }

        this.viewportWidth = options.viewportWidth;
        this.viewportHeight = options.viewportHeight;
        this.minZoom = options.minZoom;
        this.maxZoom = options.maxZoom;
        this.initialZoom = options.initialZoom;
        Object.freeze(this);
    }

    private static validatePositiveFinite(value: number, name: string): void {
        if (!Number.isFinite(value) || value <= 0) {
            throw new RangeError(`${name} must be finite and greater than zero.`);
        }
    }
}
