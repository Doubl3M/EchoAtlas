import type { MusicCatalog } from "../MusicCatalog";

export interface ImportedMusicMetadata {
    readonly version: "1.0";
    readonly title?: string;
    readonly owner?: string;
    readonly generatedAt?: string;
    readonly seed?: number;
    readonly locale?: string;
}

/** Immutable result of validating a canonical Music JSON V1 document. */
export class ImportedMusicDocument {
    public readonly metadata: ImportedMusicMetadata;
    public readonly catalog: MusicCatalog;

    public constructor(metadata: ImportedMusicMetadata, catalog: MusicCatalog) {
        this.metadata = Object.freeze({ ...metadata });
        this.catalog = catalog;
        Object.freeze(this);
    }
}
