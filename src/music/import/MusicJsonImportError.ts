export type MusicJsonImportErrorCategory = "syntax" | "validation";

/** Stable, UI-independent failure reported at a precise JSON path. */
export class MusicJsonImportError extends Error {
    public readonly category: MusicJsonImportErrorCategory;
    public readonly path: string;
    public readonly reason: string;

    public constructor(category: MusicJsonImportErrorCategory, path: string, reason: string) {
        super(`${path}: ${reason}`);
        this.name = "MusicJsonImportError";
        this.category = category;
        this.path = path;
        this.reason = reason;
        Object.freeze(this);
    }
}
