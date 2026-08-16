import { describe, expect, it } from "vitest";

import type { MusicEntityKind } from "../../../src/music";
import { ListeningEvent, ListeningHistory } from "../../../src/music";

function event(
    id: string,
    occurredAt: number,
    musicEntityId = "track-a",
    musicEntityKind: MusicEntityKind = "track"
): ListeningEvent {
    return new ListeningEvent({ id, occurredAt, musicEntityId, musicEntityKind });
}

describe("ListeningEvent", () => {
    it("preserves its canonical Music reference and explicit epoch millisecond", () => {
        const listeningEvent = event("listen-1", 1_700_000_000_000, "artist-a", "artist");

        expect(listeningEvent).toEqual({
            id: "listen-1",
            occurredAt: 1_700_000_000_000,
            musicEntityKind: "artist",
            musicEntityId: "artist-a",
        });
        expect(Object.isFrozen(listeningEvent)).toBe(true);
    });

    it.each<MusicEntityKind>([
        "artist",
        "album",
        "track",
        "genre",
        "label",
        "playlist",
        "compilation",
    ])("accepts the %s Music kind", (kind) => {
        expect(event(`listen-${kind}`, 1, `${kind}-a`, kind).musicEntityKind).toBe(kind);
    });

    it.each(["", " listen", "listen ", "   "])("rejects invalid event ID %j", (id) => {
        expect(() => event(id, 1)).toThrow(TypeError);
    });

    it.each(["", " track", "track ", "   "])("rejects invalid Music ID %j", (id) => {
        expect(() => event("listen", 1, id)).toThrow(TypeError);
    });

    it.each([NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])(
        "rejects invalid occurredAt %s",
        (occurredAt) => {
            expect(() => event("listen", occurredAt)).toThrow(RangeError);
        }
    );

    it("rejects an unsupported Music kind at runtime", () => {
        expect(
            () =>
                new ListeningEvent({
                    id: "listen",
                    occurredAt: 1,
                    musicEntityId: "track",
                    musicEntityKind: "podcast" as MusicEntityKind,
                })
        ).toThrow(TypeError);
    });
});

describe("ListeningHistory", () => {
    it("represents an empty history", () => {
        const history = new ListeningHistory();

        expect(history.getEvents()).toEqual([]);
        expect(history.getEventsUpTo(0)).toEqual([]);
        expect(history.getEventById("missing")).toBeUndefined();
        expect(history.getEarliestOccurredAt()).toBeUndefined();
        expect(history.getLatestOccurredAt()).toBeUndefined();
    });

    it("exposes explicit historical bounds without a current-time fallback", () => {
        const history = new ListeningHistory([
            event("latest", 30),
            event("earliest", -10),
            event("middle", 20),
        ]);

        expect(history.getEarliestOccurredAt()).toBe(-10);
        expect(history.getLatestOccurredAt()).toBe(30);
    });

    it("returns one event by its ID", () => {
        const listeningEvent = event("listen-1", 10);
        const history = new ListeningHistory([listeningEvent]);

        expect(history.getEvents()).toEqual([listeningEvent]);
        expect(history.getEventById("listen-1")).toBe(listeningEvent);
    });

    it("sorts by occurredAt then explicit lexical event ID", () => {
        const history = new ListeningHistory([
            event("listen-z", 20),
            event("listen-10", 10),
            event("listen-2", 10),
            event("Listen-a", 10),
        ]);

        expect(history.getEvents().map(({ id }) => id)).toEqual([
            "Listen-a",
            "listen-10",
            "listen-2",
            "listen-z",
        ]);
    });

    it("rejects duplicate event IDs without deduplicating musical facts", () => {
        expect(() => new ListeningHistory([event("same", 1), event("same", 2)])).toThrow(
            "Duplicate listening event ID: same"
        );

        const history = new ListeningHistory([event("first", 1), event("second", 1)]);
        expect(history.getEvents()).toHaveLength(2);
    });

    it("includes T and excludes an event immediately after T", () => {
        const history = new ListeningHistory([
            event("before", 9),
            event("at", 10),
            event("after", 11),
        ]);

        expect(history.getEventsUpTo(10).map(({ id }) => id)).toEqual(["before", "at"]);
    });

    it("returns empty before the first event and all events after the last", () => {
        const history = new ListeningHistory([event("a", 10), event("b", 20)]);

        expect(history.getEventsUpTo(9)).toEqual([]);
        expect(history.getEventsUpTo(20)).toEqual(history.getEvents());
        expect(history.getEventsUpTo(21)).toEqual(history.getEvents());
    });

    it("returns an inclusive time interval", () => {
        const history = new ListeningHistory([
            event("a", 9),
            event("b", 10),
            event("c", 20),
            event("d", 21),
        ]);

        expect(history.getEventsBetween(10, 20).map(({ id }) => id)).toEqual(["b", "c"]);
        expect(() => history.getEventsBetween(20, 10)).toThrow(RangeError);
    });

    it("keeps repeated listens of the same Music identity", () => {
        const history = new ListeningHistory([
            event("listen-2", 20, "track-a"),
            event("listen-1", 10, "track-a"),
            event("other", 15, "track-b"),
        ]);

        expect(
            history.getEventsForIdentityUpTo("track", "track-a", 20).map(({ id }) => id)
        ).toEqual(["listen-1", "listen-2"]);
    });

    it("accepts a Music identity absent from every catalog", () => {
        const absent = event("external-listen", 10, "not-in-catalog", "track");
        const history = new ListeningHistory([absent]);

        expect(history.getEventsForIdentityUpTo("track", "not-in-catalog", 10)).toEqual([absent]);
    });

    it("reconstructs T directly without depending on previous queries", () => {
        const history = new ListeningHistory([event("a", 10), event("b", 20), event("c", 30)]);
        const direct = history.getEventsUpTo(30);

        history.getEventsUpTo(10);
        history.getEventsUpTo(20);

        expect(history.getEventsUpTo(30)).toEqual(direct);
    });

    it("is independent from constructor input order", () => {
        const events = [event("c", 30), event("a", 10), event("b", 20)];
        const first = new ListeningHistory(events);
        const second = new ListeningHistory([events[1], events[2], events[0]]);

        expect(second.getEvents()).toEqual(first.getEvents());
        expect(second.getEventsUpTo(20)).toEqual(first.getEventsUpTo(20));
    });

    it("defensively copies inputs and every returned collection", () => {
        const source = [event("a", 10), event("b", 20)];
        const history = new ListeningHistory(source);
        source.length = 0;

        const first = history.getEvents();
        const second = history.getEvents();
        expect(first).not.toBe(second);
        expect(first).toHaveLength(2);
        expect(Object.isFrozen(first)).toBe(true);
        expect(() => (first as ListeningEvent[]).pop()).toThrow(TypeError);
        expect(history.getEvents()).toHaveLength(2);
    });

    it("queries a consequential synthetic history canonically", () => {
        const source = Array.from({ length: 10_000 }, (_, index) =>
            event(`listen-${String(index).padStart(5, "0")}`, 20_000 - index, `track-${index % 7}`)
        ).reverse();
        const history = new ListeningHistory(source);

        expect(history.getEventsUpTo(15_000)).toHaveLength(5_000);
        expect(history.getEventsForIdentityUpTo("track", "track-3", 15_000)).toHaveLength(715);
        expect(history.getEvents()[0].occurredAt).toBe(10_001);
        expect(history.getEvents().at(-1)?.occurredAt).toBe(20_000);
    });

    it.each([NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])(
        "rejects an invalid query time %s",
        (time) => {
            const history = new ListeningHistory();
            expect(() => history.getEventsUpTo(time)).toThrow(RangeError);
            expect(() => history.getEventsBetween(0, time)).toThrow(RangeError);
        }
    );
});
