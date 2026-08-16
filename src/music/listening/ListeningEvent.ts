import type { MusicEntityKind } from "../MusicEntity";
import { musicEntityKinds, validateMusicText } from "../MusicEntity";

export interface ListeningEventOptions {
    readonly id: string;
    readonly occurredAt: number;
    readonly musicEntityKind: MusicEntityKind;
    readonly musicEntityId: string;
}

/** An immutable fact of listening at an explicit Unix epoch millisecond. */
export class ListeningEvent {
    public readonly id: string;
    public readonly occurredAt: number;
    public readonly musicEntityKind: MusicEntityKind;
    public readonly musicEntityId: string;

    public constructor(options: ListeningEventOptions) {
        validateMusicText(options.id, "Listening event ID");
        validateOccurredAt(options.occurredAt, "Listening event occurredAt");
        validateMusicEntityKind(options.musicEntityKind);
        validateMusicText(options.musicEntityId, "Listening event Music entity ID");

        this.id = options.id;
        this.occurredAt = options.occurredAt;
        this.musicEntityKind = options.musicEntityKind;
        this.musicEntityId = options.musicEntityId;
        Object.freeze(this);
    }
}

export function validateOccurredAt(value: number, name: string): void {
    if (!Number.isSafeInteger(value)) {
        throw new RangeError(`${name} must be a safe Unix epoch millisecond integer.`);
    }
}

function validateMusicEntityKind(kind: MusicEntityKind): void {
    if (!musicEntityKinds.includes(kind)) {
        throw new TypeError(`Unsupported listening event Music entity kind: ${String(kind)}`);
    }
}
