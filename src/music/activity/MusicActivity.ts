import type { MusicEntityKind } from "../MusicEntity";
import { musicEntityKinds, validateMusicText } from "../MusicEntity";
import { validateOccurredAt } from "../listening/ListeningEvent";

export type MusicActivityState = "active" | "inactive";

export interface MusicActivityOptions {
    readonly musicEntityKind: MusicEntityKind;
    readonly musicEntityId: string;
    readonly lastActivityAt: number;
    readonly state?: MusicActivityState;
}

/** Immutable Music-domain activity measurement, independent from geographic appearance. */
export class MusicActivity {
    public readonly musicEntityKind: MusicEntityKind;
    public readonly musicEntityId: string;
    public readonly lastActivityAt: number;
    public readonly state: MusicActivityState | undefined;

    public constructor(options: MusicActivityOptions) {
        if (!musicEntityKinds.includes(options.musicEntityKind)) {
            throw new TypeError(
                `Unsupported Music activity entity kind: ${String(options.musicEntityKind)}`
            );
        }
        validateMusicText(options.musicEntityId, "Music activity entity ID");
        validateOccurredAt(options.lastActivityAt, "Music activity instant");
        if (options.state !== undefined && options.musicEntityKind !== "artist") {
            throw new TypeError("Only Artist activity is classified by music-activity-v1.");
        }
        if (
            options.state !== undefined &&
            options.state !== "active" &&
            options.state !== "inactive"
        ) {
            throw new TypeError(`Unsupported Music activity state: ${String(options.state)}`);
        }

        this.musicEntityKind = options.musicEntityKind;
        this.musicEntityId = options.musicEntityId;
        this.lastActivityAt = options.lastActivityAt;
        this.state = options.state;
        Object.freeze(this);
    }
}
