import type { ListeningHistory } from "../listening";
import { validateOccurredAt } from "../listening/ListeningEvent";
import { MusicCatalog } from "../MusicCatalog";
import type { MusicEntity, MusicEntityKind } from "../MusicEntity";
import type { MusicRelation } from "../MusicRelation";
import { isStructuralMusicRelationV1 } from "../MusicStructuralRelation";
import { TemporalMusicSnapshot } from "./TemporalMusicSnapshot";
import {
    validateTemporalMusicRulesVersion,
    type TemporalMusicRulesVersion,
} from "./TemporalMusicRulesVersion";

export interface TemporalMusicProjectorOptions {
    readonly rulesVersion: TemporalMusicRulesVersion;
}

export interface TemporalMusicProjectionInput {
    readonly catalog: MusicCatalog;
    readonly listeningHistory: ListeningHistory;
    readonly at: number;
}

/** Projects immutable Music presence at T without interpreting activity or appearance. */
export class TemporalMusicProjector {
    private readonly rulesVersion: TemporalMusicRulesVersion;

    public constructor(options: TemporalMusicProjectorOptions) {
        validateTemporalMusicRulesVersion(options.rulesVersion);
        this.rulesVersion = options.rulesVersion;
        Object.freeze(this);
    }

    public project(input: TemporalMusicProjectionInput): TemporalMusicSnapshot {
        validateOccurredAt(input.at, "Temporal Music projection instant");

        const entitiesByIdentity = indexEntities(input.catalog.getEntities());
        const structuralParents = indexStructuralParents(
            input.catalog.getRelations(),
            entitiesByIdentity
        );
        const presentIdentities = new Set<string>();
        const pendingIdentities: string[] = [];

        for (const event of input.listeningHistory.getEventsUpTo(input.at)) {
            const identity = identityKey(event.musicEntityKind, event.musicEntityId);
            if (entitiesByIdentity.has(identity) && !presentIdentities.has(identity)) {
                presentIdentities.add(identity);
                pendingIdentities.push(identity);
            }
        }

        for (let index = 0; index < pendingIdentities.length; index += 1) {
            const identity = pendingIdentities[index];
            for (const parentIdentity of structuralParents.get(identity) ?? []) {
                if (!presentIdentities.has(parentIdentity)) {
                    presentIdentities.add(parentIdentity);
                    pendingIdentities.push(parentIdentity);
                }
            }
        }

        const entities = [...entitiesByIdentity.entries()]
            .filter(([identity]) => presentIdentities.has(identity))
            .map(([, entity]) => entity)
            .sort(compareEntities);
        const relations = [...input.catalog.getRelations()]
            .filter(
                (relation) =>
                    presentIdentities.has(identityKey(relation.sourceKind, relation.sourceId)) &&
                    presentIdentities.has(identityKey(relation.targetKind, relation.targetId))
            )
            .sort(compareRelations);

        return new TemporalMusicSnapshot(
            input.at,
            this.rulesVersion,
            new MusicCatalog(entities, relations)
        );
    }
}

function indexEntities(entities: readonly MusicEntity[]): ReadonlyMap<string, MusicEntity> {
    const index = new Map<string, MusicEntity>();
    for (const entity of entities) {
        index.set(identityKey(entity.kind, entity.id), entity);
    }
    return index;
}

function indexStructuralParents(
    relations: readonly MusicRelation[],
    entitiesByIdentity: ReadonlyMap<string, MusicEntity>
): ReadonlyMap<string, readonly string[]> {
    const mutableIndex = new Map<string, string[]>();
    for (const relation of relations) {
        if (
            !isStructuralMusicRelationV1({
                sourceKind: relation.sourceKind,
                relationKind: relation.kind,
                targetKind: relation.targetKind,
            })
        ) {
            continue;
        }
        const parentIdentity = identityKey(relation.sourceKind, relation.sourceId);
        const childIdentity = identityKey(relation.targetKind, relation.targetId);
        if (!entitiesByIdentity.has(parentIdentity) || !entitiesByIdentity.has(childIdentity)) {
            continue;
        }
        const parents = mutableIndex.get(childIdentity) ?? [];
        parents.push(parentIdentity);
        mutableIndex.set(childIdentity, parents);
    }

    const index = new Map<string, readonly string[]>();
    for (const [identity, parents] of mutableIndex) {
        index.set(identity, Object.freeze([...new Set(parents)].sort(compareText)));
    }
    return index;
}

function compareEntities(left: MusicEntity, right: MusicEntity): number {
    const kindComparison = compareText(left.kind, right.kind);
    return kindComparison === 0 ? compareText(left.id, right.id) : kindComparison;
}

function compareRelations(left: MusicRelation, right: MusicRelation): number {
    return compareText(left.id, right.id);
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function identityKey(kind: MusicEntityKind, id: string): string {
    return `${kind.length}:${kind}${id}`;
}
