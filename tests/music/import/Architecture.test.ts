/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import importerSource from "../../../src/music/import/MusicJsonImporter.ts?raw";

describe("music JSON import architecture", () => {
    it("depends only on the Music domain and local import contracts", () => {
        const imports = [...importerSource.matchAll(/from\s+["']([^"']+)["']/g)].map(
            ([, path]) => path
        );

        expect(imports).toEqual([
            "../MusicCatalog",
            "../MusicEntity",
            "../MusicEntity",
            "../MusicRelation",
            "./ImportedMusicDocument",
            "./ImportedMusicDocument",
            "./MusicJsonImportError",
        ]);
        expect(importerSource).not.toMatch(
            /\b(?:world|terrain|camera|render|ui|canvas|fetch|filesystem)\b|document\.|node:fs/i
        );
    });
});
