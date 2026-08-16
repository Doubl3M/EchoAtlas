import { musicEntityKinds, type MusicEntityKind, validateMusicText } from "../MusicEntity";
import { validateOccurredAt } from "../listening/ListeningEvent";
import { MusicActivity } from "./MusicActivity";
import {
    type MusicActivityRulesVersion,
    validateMusicActivityRulesVersion,
} from "./MusicActivityRulesVersion";

/** Immutable canonical activity snapshot at one explicit historical instant. */
export class MusicActivitySnapshot {
    public readonly at: number;
    public readonly rulesVersion: MusicActivityRulesVersion;
    private readonly activities: readonly MusicActivity[];
    private readonly activitiesByIdentity: ReadonlyMap<string, MusicActivity>;

    public constructor(
        at: number,
        rulesVersion: MusicActivityRulesVersion,
        activities: readonly MusicActivity[]
    ) {
        validateOccurredAt(at, "Music activity snapshot instant");
        validateMusicActivityRulesVersion(rulesVersion);
        const canonicalActivities = [...activities].sort(compareActivities);
        const activitiesByIdentity = new Map<string, MusicActivity>();
        for (const activity of canonicalActivities) {
            if (!(activity instanceof MusicActivity)) {
                throw new TypeError("Music activity snapshots require MusicActivity values.");
            }
            const identity = identityKey(activity.musicEntityKind, activity.musicEntityId);
            if (activitiesByIdentity.has(identity)) {
                throw new Error(
                    `Duplicate Music activity identity: ${activity.musicEntityKind}:${activity.musicEntityId}`
                );
            }
            if (activity.lastActivityAt > at) {
                throw new RangeError("Music activity cannot occur after its snapshot instant.");
            }
            activitiesByIdentity.set(identity, activity);
        }

        this.at = at;
        this.rulesVersion = rulesVersion;
        this.activities = Object.freeze(canonicalActivities);
        this.activitiesByIdentity = activitiesByIdentity;
        Object.freeze(this);
    }

    public getActivity(kind: MusicEntityKind, id: string): MusicActivity | undefined {
        if (!musicEntityKinds.includes(kind)) {
            throw new TypeError(`Unsupported Music activity entity kind: ${String(kind)}`);
        }
        validateMusicText(id, "Music activity entity ID");
        return this.activitiesByIdentity.get(identityKey(kind, id));
    }

    public getActivities(): readonly MusicActivity[] {
        return Object.freeze([...this.activities]);
    }
}

function compareActivities(left: MusicActivity, right: MusicActivity): number {
    if (left.musicEntityKind !== right.musicEntityKind) {
        return left.musicEntityKind < right.musicEntityKind ? -1 : 1;
    }
    return left.musicEntityId < right.musicEntityId
        ? -1
        : left.musicEntityId > right.musicEntityId
          ? 1
          : 0;
}

function identityKey(kind: MusicEntityKind, id: string): string {
    return `${kind.length}:${kind}${id}`;
}
