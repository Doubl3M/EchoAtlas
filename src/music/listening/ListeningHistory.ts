import type { MusicEntityKind } from "../MusicEntity";
import { musicEntityKinds, validateMusicText } from "../MusicEntity";
import { ListeningEvent, validateOccurredAt } from "./ListeningEvent";

/**
 * Immutable canonical history. History(T) includes exactly events whose occurredAt is <= T.
 */
export class ListeningHistory {
    private readonly events: readonly ListeningEvent[];
    private readonly eventsById: ReadonlyMap<string, ListeningEvent>;
    private readonly eventsByIdentity: ReadonlyMap<string, readonly ListeningEvent[]>;

    public constructor(events: readonly ListeningEvent[] = []) {
        for (const event of events) {
            if (!(event instanceof ListeningEvent)) {
                throw new TypeError("Listening history entries must be ListeningEvent values.");
            }
        }
        const canonicalEvents = [...events].sort(compareEvents);
        const eventsById = new Map<string, ListeningEvent>();
        const mutableEventsByIdentity = new Map<string, ListeningEvent[]>();

        for (const event of canonicalEvents) {
            if (eventsById.has(event.id)) {
                throw new Error(`Duplicate listening event ID: ${event.id}`);
            }
            eventsById.set(event.id, event);

            const identity = identityKey(event.musicEntityKind, event.musicEntityId);
            const identityEvents = mutableEventsByIdentity.get(identity) ?? [];
            identityEvents.push(event);
            mutableEventsByIdentity.set(identity, identityEvents);
        }

        const eventsByIdentity = new Map<string, readonly ListeningEvent[]>();
        for (const [identity, identityEvents] of mutableEventsByIdentity) {
            eventsByIdentity.set(identity, Object.freeze(identityEvents));
        }

        this.events = Object.freeze(canonicalEvents);
        this.eventsById = eventsById;
        this.eventsByIdentity = eventsByIdentity;
        Object.freeze(this);
    }

    public getEvents(): readonly ListeningEvent[] {
        return Object.freeze([...this.events]);
    }

    public getEventById(id: string): ListeningEvent | undefined {
        validateMusicText(id, "Listening event ID");
        return this.eventsById.get(id);
    }

    public getEventsUpTo(occurredAtInclusive: number): readonly ListeningEvent[] {
        validateOccurredAt(occurredAtInclusive, "Listening history upper bound");
        return copyPrefix(this.events, upperBound(this.events, occurredAtInclusive));
    }

    public getEventsBetween(
        occurredAtInclusive: number,
        occurredAtInclusiveEnd: number
    ): readonly ListeningEvent[] {
        validateOccurredAt(occurredAtInclusive, "Listening history lower bound");
        validateOccurredAt(occurredAtInclusiveEnd, "Listening history upper bound");
        if (occurredAtInclusive > occurredAtInclusiveEnd) {
            throw new RangeError("Listening history lower bound must not exceed its upper bound.");
        }

        const start = lowerBound(this.events, occurredAtInclusive);
        const end = upperBound(this.events, occurredAtInclusiveEnd);
        return Object.freeze(this.events.slice(start, end));
    }

    public getEventsForIdentityUpTo(
        kind: MusicEntityKind,
        id: string,
        occurredAtInclusive: number
    ): readonly ListeningEvent[] {
        if (!musicEntityKinds.includes(kind)) {
            throw new TypeError(`Unsupported listening history Music entity kind: ${String(kind)}`);
        }
        validateMusicText(id, "Listening history Music entity ID");
        validateOccurredAt(occurredAtInclusive, "Listening history upper bound");
        const identityEvents = this.eventsByIdentity.get(identityKey(kind, id)) ?? [];
        return copyPrefix(identityEvents, upperBound(identityEvents, occurredAtInclusive));
    }
}

function compareEvents(left: ListeningEvent, right: ListeningEvent): number {
    if (left.occurredAt !== right.occurredAt) {
        return left.occurredAt - right.occurredAt;
    }
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function lowerBound(events: readonly ListeningEvent[], occurredAt: number): number {
    let low = 0;
    let high = events.length;
    while (low < high) {
        const middle = low + Math.floor((high - low) / 2);
        if (events[middle].occurredAt < occurredAt) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }
    return low;
}

function upperBound(events: readonly ListeningEvent[], occurredAt: number): number {
    let low = 0;
    let high = events.length;
    while (low < high) {
        const middle = low + Math.floor((high - low) / 2);
        if (events[middle].occurredAt <= occurredAt) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }
    return low;
}

function copyPrefix(events: readonly ListeningEvent[], end: number): readonly ListeningEvent[] {
    return Object.freeze(events.slice(0, end));
}

function identityKey(kind: MusicEntityKind, id: string): string {
    return `${kind.length}:${kind}${id}`;
}
