import {
    MusicCatalog,
    TemporalMusicProjector,
    type ListeningHistory,
    type TemporalMusicRulesVersion,
} from "../music";
import type { WorldConfig } from "../world";

import { createMusicAtlasSnapshotFromCatalog, type MusicAtlasSnapshot } from "./MusicAtlasPipeline";

export interface TemporalMusicAtlasOptions {
    readonly catalog: MusicCatalog;
    readonly listeningHistory: ListeningHistory;
    readonly seed: number;
    readonly worldConfig: WorldConfig;
    readonly rulesVersion: TemporalMusicRulesVersion;
}

/** Application orchestration for stateless reconstruction of historical Atlas snapshots. */
export class TemporalMusicAtlas {
    private readonly catalog: MusicCatalog;
    private readonly listeningHistory: ListeningHistory;
    private readonly seed: number;
    private readonly worldConfig: WorldConfig;
    private readonly projector: TemporalMusicProjector;
    private readonly milestones: readonly number[];

    public constructor(options: TemporalMusicAtlasOptions) {
        this.catalog = options.catalog;
        this.listeningHistory = options.listeningHistory;
        this.seed = options.seed;
        this.worldConfig = options.worldConfig;
        this.projector = new TemporalMusicProjector({ rulesVersion: options.rulesVersion });
        this.milestones = Object.freeze([
            ...new Set(options.listeningHistory.getEvents().map(({ occurredAt }) => occurredAt)),
        ]);
        Object.freeze(this);
    }

    public getMilestones(): readonly number[] {
        return Object.freeze([...this.milestones]);
    }

    public getInitialHistoricalTime(): number | undefined {
        return this.listeningHistory.getLatestOccurredAt();
    }

    public project(at: number): MusicAtlasSnapshot {
        const temporalSnapshot = this.projector.project({
            catalog: this.catalog,
            listeningHistory: this.listeningHistory,
            at,
        });
        return createMusicAtlasSnapshotFromCatalog(
            temporalSnapshot.getCatalog(),
            this.seed,
            this.worldConfig
        );
    }

    public projectEmpty(): MusicAtlasSnapshot {
        return createMusicAtlasSnapshotFromCatalog(new MusicCatalog(), this.seed, this.worldConfig);
    }
}
