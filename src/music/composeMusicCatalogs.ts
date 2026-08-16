import { MusicCatalog } from "./MusicCatalog";
import type { MusicEntity } from "./MusicEntity";
import type { MusicRelation } from "./MusicRelation";

/** Composes immutable Music sources into one canonical catalog, rejecting every identity collision. */
export function composeMusicCatalogs(catalogs: readonly MusicCatalog[]): MusicCatalog {
    const entities: MusicEntity[] = [];
    const relations: MusicRelation[] = [];
    for (const catalog of catalogs) {
        if (!(catalog instanceof MusicCatalog)) {
            throw new TypeError("Music catalog composition requires MusicCatalog values.");
        }
        entities.push(...catalog.getEntities());
        relations.push(...catalog.getRelations());
    }
    entities.sort(compareEntities);
    relations.sort((left, right) => compareText(left.id, right.id));
    return new MusicCatalog(entities, relations);
}

function compareEntities(left: MusicEntity, right: MusicEntity): number {
    return compareText(left.kind, right.kind) || compareText(left.id, right.id);
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
