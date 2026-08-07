import { MusicEntity } from "./MusicEntity";
import { MusicRelation } from "./MusicRelation";

/** An immutable musical snapshot whose input order has no semantic meaning. */
export class MusicCatalog {
    private readonly entities: readonly MusicEntity[];
    private readonly relations: readonly MusicRelation[];

    public constructor(
        entities: readonly MusicEntity[] = [],
        relations: readonly MusicRelation[] = []
    ) {
        this.validateUniqueIdentities(entities, relations);
        this.entities = Object.freeze([...entities]);
        this.relations = Object.freeze([...relations]);
        Object.freeze(this);
    }

    public getEntities(): readonly MusicEntity[] {
        return this.entities;
    }

    public getRelations(): readonly MusicRelation[] {
        return this.relations;
    }

    private validateUniqueIdentities(
        entities: readonly MusicEntity[],
        relations: readonly MusicRelation[]
    ): void {
        const entityIdentities = new Set<string>();
        for (const entity of entities) {
            const identity = `${entity.kind}:${entity.id}`;
            if (entityIdentities.has(identity)) {
                throw new Error(`Duplicate music entity identity: ${identity}`);
            }
            entityIdentities.add(identity);
        }

        const relationIds = new Set<string>();
        for (const relation of relations) {
            if (relationIds.has(relation.id)) {
                throw new Error(`Duplicate music relation ID: ${relation.id}`);
            }
            relationIds.add(relation.id);
        }
    }
}
