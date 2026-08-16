import {
    MusicActivityProjector,
    MusicCatalog,
    TemporalMusicProjector,
    type ListeningHistory,
    type MusicActivityRulesVersion,
    type MusicActivitySnapshot,
    type TemporalMusicSnapshot,
    type TemporalMusicRulesVersion,
} from "../music";
import { GeographicAppearanceSnapshot, GeographicHierarchy, type WorldConfig } from "../world";

import { createMusicAtlasSnapshotFromCatalog, type MusicAtlasSnapshot } from "./MusicAtlasPipeline";
import { MusicGeographicAppearanceInterpreter } from "./MusicGeographicAppearanceInterpreter";
import { MusicGeographicInterpreter } from "./MusicGeographicInterpreter";

export interface TemporalMusicAtlasOptions {
    readonly catalog: MusicCatalog;
    readonly listeningHistory: ListeningHistory;
    readonly seed: number;
    readonly worldConfig: WorldConfig;
    readonly rulesVersion: TemporalMusicRulesVersion;
    readonly activityRulesVersion: MusicActivityRulesVersion;
}

export interface TemporalMusicAtlasState extends MusicAtlasSnapshot {
    readonly selectedHistoricalTime: number | undefined;
    readonly presence: TemporalMusicSnapshot | undefined;
    readonly activity: MusicActivitySnapshot | undefined;
    readonly hierarchy: GeographicHierarchy;
    readonly appearance: GeographicAppearanceSnapshot;
}

/** Application orchestration for stateless reconstruction of historical Atlas snapshots. */
export class TemporalMusicAtlas {
    private readonly catalog: MusicCatalog;
    private readonly listeningHistory: ListeningHistory;
    private readonly seed: number;
    private readonly worldConfig: WorldConfig;
    private readonly projector: TemporalMusicProjector;
    private readonly activityProjector: MusicActivityProjector;
    private readonly milestones: readonly number[];

    public constructor(options: TemporalMusicAtlasOptions) {
        this.catalog = options.catalog;
        this.listeningHistory = options.listeningHistory;
        this.seed = options.seed;
        this.worldConfig = options.worldConfig;
        this.projector = new TemporalMusicProjector({ rulesVersion: options.rulesVersion });
        this.activityProjector = new MusicActivityProjector({
            rulesVersion: options.activityRulesVersion,
        });
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

    public project(at: number): TemporalMusicAtlasState {
        const presence = this.projector.project({
            catalog: this.catalog,
            listeningHistory: this.listeningHistory,
            at,
        });
        const activity = this.activityProjector.project({
            catalog: this.catalog,
            listeningHistory: this.listeningHistory,
            at,
        });
        const atlas = createMusicAtlasSnapshotFromCatalog(
            presence.getCatalog(),
            this.seed,
            this.worldConfig,
            activity
        );
        return this.createState(at, presence, activity, atlas);
    }

    public projectEmpty(): TemporalMusicAtlasState {
        const atlas = createMusicAtlasSnapshotFromCatalog(
            new MusicCatalog(),
            this.seed,
            this.worldConfig
        );
        const hierarchy = new GeographicHierarchy({ features: [], contents: [] });
        return Object.freeze({
            ...atlas,
            selectedHistoricalTime: undefined,
            presence: undefined,
            activity: undefined,
            hierarchy,
            appearance: new GeographicAppearanceSnapshot({ hierarchy, appearances: [] }),
        });
    }

    private createState(
        selectedHistoricalTime: number,
        presence: TemporalMusicSnapshot,
        activity: MusicActivitySnapshot,
        atlas: MusicAtlasSnapshot
    ): TemporalMusicAtlasState {
        const hierarchy = new MusicGeographicInterpreter().interpret({
            catalog: atlas.catalog,
            knowledgeGraph: atlas.graph,
            version: "music-geography-v1",
        });
        const appearance = new MusicGeographicAppearanceInterpreter().interpret({
            activity,
            hierarchy,
            version: "music-geographic-appearance-v1",
        });
        return Object.freeze({
            ...atlas,
            selectedHistoricalTime,
            presence,
            activity,
            hierarchy,
            appearance,
        });
    }
}
