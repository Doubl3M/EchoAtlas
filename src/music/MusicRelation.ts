import type { MusicEntityKind } from "./MusicEntity";
import { musicEntityKinds, validateMusicText, validateMusicWeight } from "./MusicEntity";

export interface MusicRelationOptions {
    readonly id: string;
    readonly sourceId: string;
    readonly sourceKind: MusicEntityKind;
    readonly targetId: string;
    readonly targetKind: MusicEntityKind;
    readonly kind: string;
    readonly weight?: number;
}

/** An immutable, explicitly directed relationship between two musical concepts. */
export class MusicRelation {
    public readonly id: string;
    public readonly sourceId: string;
    public readonly sourceKind: MusicEntityKind;
    public readonly targetId: string;
    public readonly targetKind: MusicEntityKind;
    public readonly kind: string;
    public readonly weight: number;

    public constructor(options: MusicRelationOptions) {
        validateMusicText(options.id, "Music relation ID");
        validateMusicText(options.sourceId, "Music relation source ID");
        validateMusicText(options.targetId, "Music relation target ID");
        validateMusicText(options.kind, "Music relation kind");
        this.validateEntityKind(options.sourceKind, "source");
        this.validateEntityKind(options.targetKind, "target");

        const weight = options.weight ?? 1;
        validateMusicWeight(weight, "Music relation weight");

        this.id = options.id;
        this.sourceId = options.sourceId;
        this.sourceKind = options.sourceKind;
        this.targetId = options.targetId;
        this.targetKind = options.targetKind;
        this.kind = options.kind;
        this.weight = weight;
        Object.freeze(this);
    }

    private validateEntityKind(kind: MusicEntityKind, endpoint: string): void {
        if (!musicEntityKinds.includes(kind)) {
            throw new TypeError(`Unsupported music relation ${endpoint} kind: ${String(kind)}`);
        }
    }
}
