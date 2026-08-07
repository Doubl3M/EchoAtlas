export const musicEntityKinds = [
    "artist",
    "album",
    "track",
    "label",
    "genre",
    "playlist",
    "compilation",
] as const;

export type MusicEntityKind = (typeof musicEntityKinds)[number];

export interface MusicEntityOptions {
    readonly id: string;
    readonly kind: MusicEntityKind;
    /** Canonical human-readable name when the source model defines one. */
    readonly name?: string;
    /** Canonical human-readable title when the source model defines one. */
    readonly title?: string;
    readonly weight?: number;
}

/** An immutable, already validated musical concept independent of storage format. */
export class MusicEntity {
    public readonly id: string;
    public readonly kind: MusicEntityKind;
    public readonly name: string | undefined;
    public readonly title: string | undefined;
    public readonly weight: number;

    public constructor(options: MusicEntityOptions) {
        validateMusicText(options.id, "Music entity ID");
        if (!musicEntityKinds.includes(options.kind)) {
            throw new TypeError(`Unsupported music entity kind: ${String(options.kind)}`);
        }
        if (options.name !== undefined) {
            validateMusicText(options.name, "Music entity name");
        }
        if (options.title !== undefined) {
            validateMusicText(options.title, "Music entity title");
        }

        const weight = options.weight ?? 1;
        validateMusicWeight(weight, "Music entity weight");

        this.id = options.id;
        this.kind = options.kind;
        this.name = options.name;
        this.title = options.title;
        this.weight = weight;
        Object.freeze(this);
    }
}

export function validateMusicText(value: string, name: string): void {
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
        throw new TypeError(`${name} must be non-empty and have no surrounding whitespace.`);
    }
}

export function validateMusicWeight(value: number, name: string): void {
    if (!Number.isFinite(value)) {
        throw new RangeError(`${name} must be finite.`);
    }
}
