export interface IndexedWorldPositions {
    readonly x: Float64Array;
    readonly y: Float64Array;
}

export interface WorldPlacementRelation {
    readonly sourceId: string;
    readonly targetId: string;
}

export interface WorldPlacementInput {
    readonly nodeIds: readonly string[];
    readonly relations: readonly WorldPlacementRelation[];
    readonly initialPositions: IndexedWorldPositions;
    readonly width: number;
    readonly height: number;
    readonly placementIterations: number;
    readonly attractionStrength: number;
    readonly repulsionStrength: number;
}

/** Internal World contract for deterministic geographic node placement. */
export interface WorldPlacementStrategy {
    place(input: WorldPlacementInput): IndexedWorldPositions;
}
