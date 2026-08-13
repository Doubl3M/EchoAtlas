import type { GeographicFeatureId } from "./GeographicFeature";
import type { GeographicLayout } from "./GeographicLayout";

const NO_OWNER_INDEX = 0xffffffff;

export interface GeographicRegionFieldOptions {
    readonly layout: GeographicLayout;
    readonly columns: number;
    readonly rows: number;
    readonly ownerFeatureIds: readonly (GeographicFeatureId | undefined)[];
}

/** Immutable sampled ownership of logical World territory by Region features. */
export class GeographicRegionField {
    public readonly worldWidth: number;
    public readonly worldHeight: number;
    private readonly columns: number;
    private readonly rows: number;
    private readonly regionFeatureIds: readonly GeographicFeatureId[];
    private readonly ownerIndexes: Uint32Array;

    public constructor(options: GeographicRegionFieldOptions) {
        validateResolution(options.columns, "columns");
        validateResolution(options.rows, "rows");
        const cellCount = options.columns * options.rows;
        if (!Number.isSafeInteger(cellCount) || options.ownerFeatureIds.length !== cellCount) {
            throw new RangeError(
                "Geographic region field ownership must match its exact cell count."
            );
        }

        const uniqueIds = new Set<GeographicFeatureId>();
        for (const ownerId of options.ownerFeatureIds) {
            if (ownerId === undefined) continue;
            const placement = options.layout.getPlacementByFeatureId(ownerId);
            if (placement === undefined) {
                throw new Error(`Unknown geographic region owner feature ID: ${ownerId}`);
            }
            if (placement.kind !== "region") {
                throw new Error(`Geographic region owner must have a Region placement: ${ownerId}`);
            }
            uniqueIds.add(ownerId);
        }
        this.regionFeatureIds = Object.freeze([...uniqueIds].sort(compareText));
        if (this.regionFeatureIds.length >= NO_OWNER_INDEX) {
            throw new RangeError("Geographic region field has too many owner features.");
        }
        const indexesById = new Map(
            this.regionFeatureIds.map((featureId, index) => [featureId, index] as const)
        );
        this.ownerIndexes = new Uint32Array(cellCount);
        for (let index = 0; index < cellCount; index += 1) {
            const ownerId = options.ownerFeatureIds[index];
            this.ownerIndexes[index] =
                ownerId === undefined ? NO_OWNER_INDEX : (indexesById.get(ownerId) as number);
        }

        this.worldWidth = options.layout.width;
        this.worldHeight = options.layout.height;
        this.columns = options.columns;
        this.rows = options.rows;
        Object.freeze(this);
    }

    public getColumnCount(): number {
        return this.columns;
    }

    public getRowCount(): number {
        return this.rows;
    }

    public getOwnerFeatureId(column: number, row: number): GeographicFeatureId | undefined {
        validateCellIndex(column, this.columns, "column");
        validateCellIndex(row, this.rows, "row");
        return this.ownerIdAtIndex(row * this.columns + column);
    }

    public getOwnerFeatureIdAtWorldPosition(x: number, y: number): GeographicFeatureId | undefined {
        validateWorldCoordinate(x, this.worldWidth, "x");
        validateWorldCoordinate(y, this.worldHeight, "y");
        const column = Math.min(this.columns - 1, Math.floor((x * this.columns) / this.worldWidth));
        const row = Math.min(this.rows - 1, Math.floor((y * this.rows) / this.worldHeight));
        return this.ownerIdAtIndex(row * this.columns + column);
    }

    private ownerIdAtIndex(index: number): GeographicFeatureId | undefined {
        const ownerIndex = this.ownerIndexes[index] as number;
        return ownerIndex === NO_OWNER_INDEX ? undefined : this.regionFeatureIds[ownerIndex];
    }
}

function validateResolution(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new RangeError(`Geographic region field ${name} must be a positive safe integer.`);
    }
}

function validateCellIndex(value: number, size: number, name: string): void {
    if (!Number.isSafeInteger(value) || value < 0 || value >= size) {
        throw new RangeError(`${name} must be a valid geographic region field cell index.`);
    }
}

function validateWorldCoordinate(value: number, size: number, name: string): void {
    if (!Number.isFinite(value) || value < 0 || value > size) {
        throw new RangeError(`${name} must be finite and inside the logical World extent.`);
    }
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
