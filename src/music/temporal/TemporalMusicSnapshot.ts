import type { MusicCatalog } from "../MusicCatalog";
import { validateOccurredAt } from "../listening/ListeningEvent";
import {
    validateTemporalMusicRulesVersion,
    type TemporalMusicRulesVersion,
} from "./TemporalMusicRulesVersion";

/** Immutable Music-domain presence snapshot at one explicit historical instant. */
export class TemporalMusicSnapshot {
    public readonly at: number;
    public readonly rulesVersion: TemporalMusicRulesVersion;
    private readonly catalog: MusicCatalog;

    public constructor(at: number, rulesVersion: TemporalMusicRulesVersion, catalog: MusicCatalog) {
        validateOccurredAt(at, "Temporal Music snapshot instant");
        validateTemporalMusicRulesVersion(rulesVersion);
        this.at = at;
        this.rulesVersion = rulesVersion;
        this.catalog = catalog;
        Object.freeze(this);
    }

    public getCatalog(): MusicCatalog {
        return this.catalog;
    }
}
