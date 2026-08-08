import { HeightField } from "../engine/terrain";

import { WorldConnection } from "./WorldConnection";
import { WorldLocation } from "./WorldLocation";

export interface GeographicWorldOptions {
    readonly width: number;
    readonly height: number;
    readonly heightField: HeightField;
    readonly locations: readonly WorldLocation[];
    readonly connections: readonly WorldConnection[];
}

/** Immutable geographic snapshot with collections ordered by their Knowledge Graph IDs. */
export class GeographicWorld {
    public readonly width: number;
    public readonly height: number;
    public readonly heightField: HeightField;
    private readonly locations: readonly WorldLocation[];
    private readonly connections: readonly WorldConnection[];
    private readonly locationsByNodeId: ReadonlyMap<string, WorldLocation>;
    private readonly connectionsByRelationId: ReadonlyMap<string, WorldConnection>;

    public constructor(options: GeographicWorldOptions) {
        this.width = options.width;
        this.height = options.height;
        this.heightField = options.heightField;
        this.locations = Object.freeze(
            [...options.locations].sort((left, right) =>
                GeographicWorld.compareIds(left.knowledgeNodeId, right.knowledgeNodeId)
            )
        );
        this.validateLocationBounds(this.locations);
        this.locationsByNodeId = this.indexLocations(this.locations);
        this.connections = Object.freeze(
            [...options.connections].sort((left, right) =>
                GeographicWorld.compareIds(left.knowledgeRelationId, right.knowledgeRelationId)
            )
        );
        this.connectionsByRelationId = this.indexConnections(this.connections);
        this.validateConnectionEndpoints(this.connections);
        Object.freeze(this);
    }

    public getLocationByKnowledgeNodeId(id: string): WorldLocation | undefined {
        return this.locationsByNodeId.get(id);
    }

    public getConnectionByKnowledgeRelationId(id: string): WorldConnection | undefined {
        return this.connectionsByRelationId.get(id);
    }

    public getLocations(): readonly WorldLocation[] {
        return this.locations;
    }

    public getConnections(): readonly WorldConnection[] {
        return this.connections;
    }

    private static compareIds(left: string, right: string): number {
        return left < right ? -1 : left > right ? 1 : 0;
    }

    private indexLocations(
        locations: readonly WorldLocation[]
    ): ReadonlyMap<string, WorldLocation> {
        const index = new Map<string, WorldLocation>();
        for (const location of locations) {
            if (index.has(location.knowledgeNodeId)) {
                throw new Error(`Duplicate location for node ID: ${location.knowledgeNodeId}`);
            }
            index.set(location.knowledgeNodeId, location);
        }
        return index;
    }

    private validateLocationBounds(locations: readonly WorldLocation[]): void {
        for (const location of locations) {
            if (location.x > this.width - 1 || location.y > this.height - 1) {
                throw new RangeError(
                    `Location for node ID ${location.knowledgeNodeId} is outside world bounds.`
                );
            }
        }
    }

    private indexConnections(
        connections: readonly WorldConnection[]
    ): ReadonlyMap<string, WorldConnection> {
        const index = new Map<string, WorldConnection>();
        for (const connection of connections) {
            if (index.has(connection.knowledgeRelationId)) {
                throw new Error(
                    `Duplicate connection for relation ID: ${connection.knowledgeRelationId}`
                );
            }
            index.set(connection.knowledgeRelationId, connection);
        }
        return index;
    }

    private validateConnectionEndpoints(connections: readonly WorldConnection[]): void {
        for (const connection of connections) {
            if (!this.locationsByNodeId.has(connection.sourceKnowledgeNodeId)) {
                throw new Error(
                    `Unknown connection source node ID: ${connection.sourceKnowledgeNodeId}`
                );
            }
            if (!this.locationsByNodeId.has(connection.targetKnowledgeNodeId)) {
                throw new Error(
                    `Unknown connection target node ID: ${connection.targetKnowledgeNodeId}`
                );
            }
        }
    }
}
