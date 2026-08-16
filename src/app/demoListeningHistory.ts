import { ListeningEvent, ListeningHistory, type MusicEntityKind } from "../music";

export const demoHistoricalTimes = Object.freeze({
    beginnings: 127_440_000_000,
    crossings: 204_163_200_000,
    expansion: 242_870_400_000,
    latest: 289_267_200_000,
});

/** Local deterministic listening fixture used only by the temporal browser showcase. */
export function createDemoListeningHistory(): ListeningHistory {
    return new ListeningHistory([
        ...eventsAt(demoHistoricalTimes.beginnings, [
            ["track", "sound-and-vision"],
            ["track", "always-crashing"],
            ["track", "st-elmos-fire"],
            ["track", "golden-hours"],
        ]),
        ...eventsAt(demoHistoricalTimes.crossings, [
            ["track", "coyote"],
            ["track", "amelia"],
            ["track", "dreams"],
            ["track", "the-chain"],
            ["track", "zombie-track"],
            ["track", "mr-follow-follow"],
        ]),
        ...eventsAt(demoHistoricalTimes.expansion, [
            ["track", "sound-and-vision"],
            ["track", "st-elmos-fire"],
            ["track", "sir-duke"],
            ["track", "as"],
            ["track", "europe-endless"],
            ["track", "showroom-dummies"],
            ["track", "the-revolution"],
            ["track", "home-is-where-hatred-is"],
        ]),
        ...eventsAt(demoHistoricalTimes.latest, [
            ["track", "in-france"],
            ["track", "edith-and-kingpin"],
            ["track", "robots"],
            ["track", "model"],
            ["label", "motown"],
            ["label", "warner-bros"],
            ["label", "rca"],
            ["label", "island"],
            ["label", "flying-dutchman"],
            ["label", "capitol"],
            ["playlist", "night-drive"],
            ["playlist", "golden-afternoon"],
            ["playlist", "roads-less-travelled"],
        ]),
    ]);
}

function eventsAt(
    occurredAt: number,
    identities: readonly (readonly [MusicEntityKind, string])[]
): readonly ListeningEvent[] {
    return identities.map(
        ([musicEntityKind, musicEntityId], index) =>
            new ListeningEvent({
                id: `demo-listen:${occurredAt}:${String(index).padStart(2, "0")}`,
                occurredAt,
                musicEntityKind,
                musicEntityId,
            })
    );
}
