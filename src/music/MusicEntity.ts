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

interface MusicEntityBaseOptions {
    readonly id: string;
    readonly weight?: number;
}

interface ArtistOptions extends MusicEntityBaseOptions {
    readonly kind: "artist";
    readonly name?: string;
    readonly country?: string;
    readonly formed?: number;
    readonly tags?: readonly string[];
    readonly title?: never;
    readonly year?: never;
    readonly duration?: never;
    readonly trackNumber?: never;
}

interface AlbumOptions extends MusicEntityBaseOptions {
    readonly kind: "album";
    readonly title?: string;
    readonly year?: number;
    readonly duration?: number;
    readonly name?: never;
    readonly country?: never;
    readonly formed?: never;
    readonly tags?: never;
    readonly trackNumber?: never;
}

interface TrackOptions extends MusicEntityBaseOptions {
    readonly kind: "track";
    readonly title?: string;
    readonly duration?: number;
    readonly trackNumber?: number;
    readonly name?: never;
    readonly country?: never;
    readonly formed?: never;
    readonly tags?: never;
    readonly year?: never;
}

interface NamedEntityOptions extends MusicEntityBaseOptions {
    readonly kind: "label" | "playlist";
    readonly name?: string;
    readonly title?: never;
    readonly country?: never;
    readonly formed?: never;
    readonly tags?: never;
    readonly year?: never;
    readonly duration?: never;
    readonly trackNumber?: never;
}

interface GeneralEntityOptions extends MusicEntityBaseOptions {
    readonly kind: "genre" | "compilation";
    readonly name?: string;
    readonly title?: string;
    readonly country?: never;
    readonly formed?: never;
    readonly tags?: never;
    readonly year?: never;
    readonly duration?: never;
    readonly trackNumber?: never;
}

export type MusicEntityOptions =
    ArtistOptions | AlbumOptions | TrackOptions | NamedEntityOptions | GeneralEntityOptions;

/** An immutable, already validated musical concept independent of storage format. */
export class MusicEntity {
    public readonly id: string;
    public readonly kind: MusicEntityKind;
    public readonly name: string | undefined;
    public readonly title: string | undefined;
    public readonly country: string | undefined;
    public readonly formed: number | undefined;
    public readonly tags: readonly string[] | undefined;
    public readonly year: number | undefined;
    public readonly duration: number | undefined;
    public readonly trackNumber: number | undefined;
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
        this.rejectIncompatibleAttributes(options);
        this.validateAttributes(options);

        const weight = options.weight ?? 1;
        validateMusicWeight(weight, "Music entity weight");

        this.id = options.id;
        this.kind = options.kind;
        this.name = options.name;
        this.title = options.title;
        this.country = options.country;
        this.formed = options.formed;
        this.tags = options.tags === undefined ? undefined : Object.freeze([...options.tags]);
        this.year = options.year;
        this.duration = options.duration;
        this.trackNumber = options.trackNumber;
        this.weight = weight;
        Object.freeze(this);
    }

    private validateAttributes(options: MusicEntityOptions): void {
        if (options.kind === "artist") {
            this.validateArtist(options);
            return;
        }
        if (options.kind === "album") {
            validateOptionalInteger(options.year, "Music album year");
            validateOptionalDuration(options.duration);
            return;
        }
        if (options.kind === "track") {
            validateOptionalDuration(options.duration);
            validateOptionalPositiveInteger(options.trackNumber, "Music track number");
        }
    }

    private rejectIncompatibleAttributes(options: MusicEntityOptions): void {
        const attributes = [
            ["name", options.name],
            ["title", options.title],
            ["country", options.country],
            ["formed", options.formed],
            ["tags", options.tags],
            ["year", options.year],
            ["duration", options.duration],
            ["trackNumber", options.trackNumber],
        ] as const;
        const allowed = allowedAttributesByKind[options.kind];
        for (const [attribute, value] of attributes) {
            if (value !== undefined && !allowed.includes(attribute)) {
                throw new TypeError(`Music ${options.kind} does not support ${attribute}.`);
            }
        }
    }

    private validateArtist(options: ArtistOptions): void {
        if (options.country !== undefined) {
            validateMusicText(options.country, "Music artist country");
        }
        validateOptionalInteger(options.formed, "Music artist formed year");
        if (options.tags !== undefined) {
            if (!Array.isArray(options.tags)) {
                throw new TypeError("Music artist tags must be an array.");
            }
            for (const tag of options.tags) {
                validateMusicText(tag, "Music artist tag");
            }
        }
    }
}

const allowedAttributesByKind: Readonly<Record<MusicEntityKind, readonly MusicEntityAttribute[]>> =
    {
        artist: ["name", "country", "formed", "tags"],
        album: ["title", "year", "duration"],
        track: ["title", "duration", "trackNumber"],
        label: ["name"],
        playlist: ["name"],
        genre: ["name", "title"],
        compilation: ["name", "title"],
    };

type MusicEntityAttribute =
    "name" | "title" | "country" | "formed" | "tags" | "year" | "duration" | "trackNumber";

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

function validateOptionalInteger(value: number | undefined, name: string): void {
    if (value !== undefined && !Number.isSafeInteger(value)) {
        throw new RangeError(`${name} must be a safe integer.`);
    }
}

function validateOptionalDuration(value: number | undefined): void {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new RangeError("Music duration must be finite and non-negative.");
    }
}

function validateOptionalPositiveInteger(value: number | undefined, name: string): void {
    if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
        throw new RangeError(`${name} must be a positive safe integer.`);
    }
}
