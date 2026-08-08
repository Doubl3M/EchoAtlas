export interface ElevationBand {
    /** Inclusive upper bound; bands form a cumulative partition in strictly increasing order. */
    readonly maximum: number;
    readonly color: string;
}

export interface BackgroundTextureStyle {
    readonly enabled: boolean;
    readonly color: string;
    readonly spacing: number;
    readonly size: number;
}

export interface TerrainContourStyle {
    readonly enabled: boolean;
    readonly color: string;
    readonly width: number;
    readonly opacity: number;
}

export interface TerrainVisualStyle {
    /** Screen-space overlap removes backing-store seams without changing World geometry. */
    readonly cellOverlap: number;
    readonly contour: TerrainContourStyle;
}

export interface ConnectionVisualStyle {
    readonly color: string;
    readonly width: number;
    readonly opacity: number;
    readonly casingColor: string;
    readonly casingWidth: number;
    readonly casingOpacity: number;
    /** Screen-space bend applied deterministically from the connection identity. */
    readonly curveStrength: number;
}

export interface LocationVisualStyle {
    readonly fillColor: string;
    readonly strokeColor: string;
    readonly strokeWidth: number;
    readonly radius: number;
    readonly centerColor: string;
    readonly centerRadius: number;
}

export interface LabelVisualStyle {
    readonly enabled: boolean;
    /** Labels are rendered at this zoom and above. */
    readonly minZoom: number;
    readonly color: string;
    readonly font: string;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly haloColor: string;
    readonly haloWidth: number;
    readonly collisionPadding: number;
}

/** Complete visual tokens consumed by CanvasRenderer without theme-specific branches. */
export interface VisualTheme {
    readonly backgroundColor: string;
    readonly backgroundTexture: BackgroundTextureStyle;
    readonly terrainBands: readonly ElevationBand[];
    readonly terrain: TerrainVisualStyle;
    readonly connection: ConnectionVisualStyle;
    readonly location: LocationVisualStyle;
    readonly label: LabelVisualStyle;
}
