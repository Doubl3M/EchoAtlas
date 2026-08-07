import { describe, expect, it } from "vitest";

import type {
    ImportedMusicMetadata,
    MusicJsonImportErrorCategory,
} from "../../../src/music/import";

describe("music import public API", () => {
    it("exports only the necessary runtime symbols", async () => {
        const publicApi = await import("../../../src/music/import");

        expect(Object.keys(publicApi).sort()).toEqual([
            "ImportedMusicDocument",
            "MusicJsonImportError",
            "MusicJsonImporter",
        ]);
    });

    it("exports metadata and error category as types", () => {
        const metadata: ImportedMusicMetadata = { version: "1.0", seed: 42 };
        const category: MusicJsonImportErrorCategory = "validation";

        expect(metadata.seed).toBe(42);
        expect(category).toBe("validation");
    });
});
