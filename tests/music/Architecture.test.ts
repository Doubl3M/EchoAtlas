/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import interpreterSource from "../../src/music/MusicInterpreter.ts?raw";

describe("music architecture", () => {
    it("keeps MusicInterpreter dependencies within music and knowledge", () => {
        const imports = [...interpreterSource.matchAll(/from\s+["']([^"']+)["']/g)].map(
            ([, path]) => path
        );

        expect(imports).toEqual([
            "../knowledge",
            "./MusicEntity",
            "./MusicCatalog",
            "./MusicRelation",
        ]);
        expect(interpreterSource).not.toMatch(
            /(?:world|terrain|camera|render|ui|document|canvas|geograph)/i
        );
    });
});
