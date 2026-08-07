export interface WorldLocationOptions {
    readonly knowledgeNodeId: string;
    readonly x: number;
    readonly y: number;
    readonly elevation: number;
}

/** Immutable geographic representation of exactly one Knowledge Graph node. */
export class WorldLocation {
    public readonly knowledgeNodeId: string;
    public readonly x: number;
    public readonly y: number;
    public readonly elevation: number;

    public constructor(options: WorldLocationOptions, worldWidth: number, worldHeight: number) {
        WorldLocation.validateId(options.knowledgeNodeId);
        WorldLocation.validateCoordinate(options.x, worldWidth, "x");
        WorldLocation.validateCoordinate(options.y, worldHeight, "y");

        if (!Number.isFinite(options.elevation) || options.elevation < 0 || options.elevation > 1) {
            throw new RangeError("elevation must be finite and in [0, 1].");
        }

        this.knowledgeNodeId = options.knowledgeNodeId;
        this.x = options.x;
        this.y = options.y;
        this.elevation = options.elevation;
        Object.freeze(this);
    }

    private static validateId(id: string): void {
        if (typeof id !== "string" || id.length === 0 || id.trim() !== id) {
            throw new TypeError(
                "knowledgeNodeId must be non-empty and have no surrounding whitespace."
            );
        }
    }

    private static validateCoordinate(value: number, size: number, name: string): void {
        if (!Number.isSafeInteger(size) || size <= 0) {
            throw new RangeError("World dimensions must be positive safe integers.");
        }

        if (!Number.isFinite(value) || value < 0 || value > size - 1) {
            throw new RangeError(`${name} must be finite and inside the world bounds.`);
        }
    }
}
