import type { ListeningHistory } from "../listening";
import { validateOccurredAt } from "../listening/ListeningEvent";
import type { MusicCatalog } from "../MusicCatalog";
import type { MusicEntity, MusicEntityKind } from "../MusicEntity";
import type { MusicRelation } from "../MusicRelation";
import { isStructuralMusicRelationV1 } from "../MusicStructuralRelation";
import { MusicActivity, type MusicActivityState } from "./MusicActivity";
import {
    type MusicActivityRulesVersion,
    validateMusicActivityRulesVersion,
} from "./MusicActivityRulesVersion";
import { MusicActivitySnapshot } from "./MusicActivitySnapshot";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

/** Exactly 180 days: the V1 product approximation of six months. */
const ARTIST_INACTIVITY_THRESHOLD_MS = 180 * MILLISECONDS_PER_DAY;

export interface MusicActivityProjectorOptions {
    readonly rulesVersion: MusicActivityRulesVersion;
}

export interface MusicActivityProjectionInput {
    readonly catalog: MusicCatalog;
    readonly listeningHistory: ListeningHistory;
    readonly at: number;
}

/** Projects Music activity at T without deciding presence, geography or appearance. */
export class MusicActivityProjector {
    private readonly rulesVersion: MusicActivityRulesVersion;

    public constructor(options: MusicActivityProjectorOptions) {
        validateMusicActivityRulesVersion(options.rulesVersion);
        this.rulesVersion = options.rulesVersion;
        Object.freeze(this);
    }

    public project(input: MusicActivityProjectionInput): MusicActivitySnapshot {
        validateOccurredAt(input.at, "Music activity projection instant");
        const entities = [...input.catalog.getEntities()].sort(compareEntities);
        const entitiesByIdentity = indexEntities(entities);
        const structuralParents = indexStructuralParents(
            input.catalog.getRelations(),
            entitiesByIdentity
        );
        const lastActivityByIdentity = new Map<string, number>();

        for (const event of input.listeningHistory.getEventsUpTo(input.at)) {
            const identity = identityKey(event.musicEntityKind, event.musicEntityId);
            if (entitiesByIdentity.has(identity)) {
                lastActivityByIdentity.set(identity, event.occurredAt);
            }
        }

        for (const childKind of ["track", "album", "artist"] as const) {
            for (const entity of entities) {
                if (entity.kind !== childKind) continue;
                const childIdentity = identityKey(entity.kind, entity.id);
                const childActivity = lastActivityByIdentity.get(childIdentity);
                if (childActivity === undefined) continue;
                for (const parentIdentity of structuralParents.get(childIdentity) ?? []) {
                    const parentActivity = lastActivityByIdentity.get(parentIdentity);
                    if (parentActivity === undefined || childActivity > parentActivity) {
                        lastActivityByIdentity.set(parentIdentity, childActivity);
                    }
                }
            }
        }

        const activities = entities.flatMap((entity) => {
            const lastActivityAt = lastActivityByIdentity.get(identityKey(entity.kind, entity.id));
            if (lastActivityAt === undefined) return [];
            return [
                new MusicActivity({
                    musicEntityKind: entity.kind,
                    musicEntityId: entity.id,
                    lastActivityAt,
                    state:
                        entity.kind === "artist"
                            ? classifyArtistActivity(lastActivityAt, input.at)
                            : undefined,
                }),
            ];
        });

        return new MusicActivitySnapshot(input.at, this.rulesVersion, activities);
    }
}

function classifyArtistActivity(lastActivityAt: number, at: number): MusicActivityState {
    const elapsed = BigInt(at) - BigInt(lastActivityAt);
    return elapsed >= BigInt(ARTIST_INACTIVITY_THRESHOLD_MS) ? "inactive" : "active";
}

function indexEntities(entities: readonly MusicEntity[]): ReadonlyMap<string, MusicEntity> {
    const index = new Map<string, MusicEntity>();
    for (const entity of entities) index.set(identityKey(entity.kind, entity.id), entity);
    return index;
}

function indexStructuralParents(
    relations: readonly MusicRelation[],
    entitiesByIdentity: ReadonlyMap<string, MusicEntity>
): ReadonlyMap<string, readonly string[]> {
    const mutableIndex = new Map<string, Set<string>>();
    for (const relation of relations) {
        if (
            !isStructuralMusicRelationV1({
                sourceKind: relation.sourceKind,
                relationKind: relation.kind,
                targetKind: relation.targetKind,
            })
        )
            continue;
        const parentIdentity = identityKey(relation.sourceKind, relation.sourceId);
        const childIdentity = identityKey(relation.targetKind, relation.targetId);
        if (!entitiesByIdentity.has(parentIdentity) || !entitiesByIdentity.has(childIdentity))
            continue;
        const parents = mutableIndex.get(childIdentity) ?? new Set<string>();
        parents.add(parentIdentity);
        mutableIndex.set(childIdentity, parents);
    }
    return new Map(
        [...mutableIndex.entries()].map(([identity, parents]) => [
            identity,
            Object.freeze([...parents].sort(compareText)),
        ])
    );
}

function compareEntities(left: MusicEntity, right: MusicEntity): number {
    return left.kind === right.kind
        ? compareText(left.id, right.id)
        : compareText(left.kind, right.kind);
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function identityKey(kind: MusicEntityKind, id: string): string {
    return `${kind.length}:${kind}${id}`;
}
