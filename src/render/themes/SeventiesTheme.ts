import type {
    ConnectionVisualStyle,
    ElevationBand,
    LabelVisualStyle,
    LandmarkVisualStyle,
    LocationVisualStyle,
    VisualTheme,
} from "../VisualTheme";

const terrainBands: readonly ElevationBand[] = Object.freeze([
    Object.freeze({ maximum: 0.12, color: "#456f70" }),
    Object.freeze({ maximum: 0.24, color: "#5f8580" }),
    Object.freeze({ maximum: 0.36, color: "#879276" }),
    Object.freeze({ maximum: 0.48, color: "#a3a06d" }),
    Object.freeze({ maximum: 0.6, color: "#b9a36a" }),
    Object.freeze({ maximum: 0.7, color: "#c99558" }),
    Object.freeze({ maximum: 0.8, color: "#bd7849" }),
    Object.freeze({ maximum: 0.9, color: "#925a3d" }),
    Object.freeze({ maximum: 1, color: "#684536" }),
]);

/** Warm, earthy default atlas theme inspired by illustrated exploration maps of the 1970s. */
export class SeventiesTheme implements VisualTheme {
    public readonly backgroundColor = "#ead9b4";
    public readonly backgroundTexture = Object.freeze({
        enabled: true,
        color: "#dec99f",
        spacing: 28,
        size: 1,
    });
    public readonly terrainBands = terrainBands;
    public readonly terrain = Object.freeze({
        cellOverlap: 0.65,
        rasterScale: 4,
        contour: Object.freeze({
            enabled: true,
            color: "#684b35",
            width: 0.55,
            opacity: 0.13,
        }),
        water: Object.freeze({
            maximum: 0.24,
            shorelineColor: "#4b625b",
            shorelineWidth: 1.15,
            shorelineOpacity: 0.48,
        }),
        ornaments: Object.freeze({
            enabled: true,
            spacing: 12,
            density: 0.82,
            reliefMinimum: 0.68,
            waterColor: "#e0d7aa",
            reliefColor: "#654735",
            width: 0.8,
            opacity: 0.56,
            size: 4.4,
        }),
    });
    public readonly connection: ConnectionVisualStyle = Object.freeze({
        color: "#6c4934",
        width: 1.15,
        opacity: 0.62,
        casingColor: "#ead6a9",
        casingWidth: 4.2,
        casingOpacity: 0.7,
        curveStrength: 7,
    });
    public readonly location: LocationVisualStyle = Object.freeze({
        fillColor: "#d39a43",
        strokeColor: "#49362b",
        strokeWidth: 1.4,
        radius: 5.2,
        centerColor: "#f3dfad",
        centerRadius: 1.55,
    });
    public readonly landmarks: LandmarkVisualStyle = Object.freeze({
        city: Object.freeze({
            enabled: true,
            detailZoom: 18,
            compactWidth: 20,
            compactHeight: 15,
            detailedWidth: 52,
            detailedHeight: 36,
            widthVariation: 0.12,
            fillColor: "#c66f3f",
            secondaryColor: "#d7a14d",
            detailColor: "#f0d79e",
            strokeColor: "#55382f",
            strokeWidth: 1.15,
            labelGap: 5,
            hitPadding: 4,
        }),
    });
    public readonly label: LabelVisualStyle = Object.freeze({
        enabled: true,
        minZoom: 0,
        color: "#3d2d24",
        font: "600 12.5px Georgia, 'Times New Roman', serif",
        offsetX: 8,
        offsetY: -8,
        haloColor: "#ead9b4",
        haloWidth: 3.5,
        collisionPadding: 5,
    });

    public constructor() {
        Object.freeze(this);
    }
}
