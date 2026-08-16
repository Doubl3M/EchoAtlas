export const currentBroadcastProvenances = ["current-listening"] as const;

export type CurrentBroadcastProvenance = (typeof currentBroadcastProvenances)[number];

export interface CurrentBroadcastEntryOptions {
    readonly id: string;
    readonly trackTitle: string;
    readonly artistName: string;
    readonly provenance: CurrentBroadcastProvenance;
    readonly musicKnowledgeNodeId?: string;
}

/** Immutable display description that does not require catalog or geographic adoption. */
export class CurrentBroadcastEntry {
    public readonly id: string;
    public readonly trackTitle: string;
    public readonly artistName: string;
    public readonly provenance: CurrentBroadcastProvenance;
    public readonly musicKnowledgeNodeId: string | undefined;

    public constructor(options: CurrentBroadcastEntryOptions) {
        validateText(options.id, "Current broadcast entry ID");
        validateText(options.trackTitle, "Current broadcast track title");
        validateText(options.artistName, "Current broadcast artist name");
        if (!currentBroadcastProvenances.includes(options.provenance)) {
            throw new TypeError(`Unsupported current broadcast provenance: ${options.provenance}`);
        }
        if (options.musicKnowledgeNodeId !== undefined) {
            validateText(options.musicKnowledgeNodeId, "Current broadcast Music identity");
        }
        this.id = options.id;
        this.trackTitle = options.trackTitle;
        this.artistName = options.artistName;
        this.provenance = options.provenance;
        this.musicKnowledgeNodeId = options.musicKnowledgeNodeId;
        Object.freeze(this);
    }
}

export interface CurrentBroadcastOptions {
    readonly entries?: readonly CurrentBroadcastEntry[];
    readonly currentEntryId?: string;
}

/** Immutable ordered snapshot of the current experience, explicitly outside World(T). */
export class CurrentBroadcast {
    private static readonly emptyEntries: readonly CurrentBroadcastEntry[] = Object.freeze([]);
    private readonly entries: readonly CurrentBroadcastEntry[];
    private readonly currentEntry: CurrentBroadcastEntry | undefined;

    public constructor(options: CurrentBroadcastOptions = {}) {
        const entries = [...(options.entries ?? [])];
        const ids = new Set<string>();
        for (const entry of entries) {
            if (!(entry instanceof CurrentBroadcastEntry)) {
                throw new TypeError(
                    "Current broadcast entries must be CurrentBroadcastEntry values."
                );
            }
            if (ids.has(entry.id))
                throw new Error(`Duplicate current broadcast entry ID: ${entry.id}`);
            ids.add(entry.id);
        }
        if (options.currentEntryId !== undefined && !ids.has(options.currentEntryId)) {
            throw new Error(`Unknown current broadcast entry ID: ${options.currentEntryId}`);
        }
        this.entries = Object.freeze(entries);
        this.currentEntry = entries.find(({ id }) => id === options.currentEntryId);
        Object.freeze(this);
    }

    public getEntries(): readonly CurrentBroadcastEntry[] {
        return this.entries.length === 0 ? CurrentBroadcast.emptyEntries : this.entries;
    }

    public getCurrentEntry(): CurrentBroadcastEntry | undefined {
        return this.currentEntry;
    }
}

function validateText(value: string, description: string): void {
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
        throw new TypeError(`${description} must be a non-empty string without peripheral spaces.`);
    }
}
