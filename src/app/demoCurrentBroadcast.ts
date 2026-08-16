import { CurrentBroadcast, CurrentBroadcastEntry } from "./CurrentBroadcast";

/** Local current-experience fixture, independent from the Music JSON showcase document. */
export function createDemoCurrentBroadcast(): CurrentBroadcast {
    const entries = [
        entry("signal-01", "Sound and Vision", "David Bowie", "music:track:sound-and-vision"),
        entry("signal-02", "The Revolution Will Not Be Televised", "Gil Scott-Heron"),
        entry("signal-03", "Europe Endless", "Kraftwerk"),
        entry("signal-04", "Amelia", "Joni Mitchell"),
        entry("signal-05", "Signals Beyond the Atlas", "Demo Transmission"),
        entry("signal-06", "Golden Hours", "Brian Eno"),
    ];
    return new CurrentBroadcast({ entries, currentEntryId: "signal-01" });
}

function entry(
    id: string,
    trackTitle: string,
    artistName: string,
    musicKnowledgeNodeId?: string
): CurrentBroadcastEntry {
    return new CurrentBroadcastEntry({
        id,
        trackTitle,
        artistName,
        provenance: "current-listening",
        musicKnowledgeNodeId,
    });
}
