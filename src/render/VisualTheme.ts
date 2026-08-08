export interface ElevationBand {
    /** Inclusive upper bound; bands form a cumulative partition in strictly increasing order. */
    readonly maximum: number;
    readonly color: string;
}

export interface ConnectionVisualStyle {
    readonly color: string;
    readonly width: number;
    readonly opacity: number;
}

export interface LocationVisualStyle {
    readonly fillColor: string;
    readonly strokeColor: string;
    readonly strokeWidth: number;
    readonly radius: number;
}

export interface LabelVisualStyle {
    readonly enabled: boolean;
    /** Labels are rendered at this zoom and above. */
    readonly minZoom: number;
    readonly color: string;
    readonly font: string;
    readonly offsetX: number;
    readonly offsetY: number;
}

/** Complete visual tokens consumed by CanvasRenderer without theme-specific branches. */
export interface VisualTheme {
    readonly backgroundColor: string;
    readonly terrainBands: readonly ElevationBand[];
    readonly connection: ConnectionVisualStyle;
    readonly location: LocationVisualStyle;
    readonly label: LabelVisualStyle;
}
