import type {
    ConnectionVisualStyle,
    ElevationBand,
    LabelVisualStyle,
    LocationVisualStyle,
    VisualTheme,
} from "../VisualTheme";

const terrainBands: readonly ElevationBand[] = Object.freeze([
    Object.freeze({ maximum: 0.2, color: "#315f5b" }),
    Object.freeze({ maximum: 0.4, color: "#6f7b45" }),
    Object.freeze({ maximum: 0.6, color: "#a49a55" }),
    Object.freeze({ maximum: 0.8, color: "#c67a3d" }),
    Object.freeze({ maximum: 1, color: "#74452f" }),
]);

/** Warm, earthy default atlas theme inspired by illustrated exploration maps of the 1970s. */
export class SeventiesTheme implements VisualTheme {
    public readonly backgroundColor = "#f1e2bd";
    public readonly terrainBands = terrainBands;
    public readonly connection: ConnectionVisualStyle = Object.freeze({
        color: "#503b2c",
        width: 1.5,
        opacity: 0.55,
    });
    public readonly location: LocationVisualStyle = Object.freeze({
        fillColor: "#d69a32",
        strokeColor: "#493527",
        strokeWidth: 1.5,
        radius: 4.5,
    });
    public readonly label: LabelVisualStyle = Object.freeze({
        enabled: true,
        minZoom: 12,
        color: "#3f3025",
        font: "600 12px Georgia, serif",
        offsetX: 7,
        offsetY: -7,
    });

    public constructor() {
        Object.freeze(this);
    }
}
