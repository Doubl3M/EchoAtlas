/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import interpreterSource from "../../src/music/MusicInterpreter.ts?raw";
import listeningEventSource from "../../src/music/listening/ListeningEvent.ts?raw";
import listeningHistorySource from "../../src/music/listening/ListeningHistory.ts?raw";
import temporalProjectorSource from "../../src/music/temporal/TemporalMusicProjector.ts?raw";

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
            "./MusicKnowledgeIdentity",
        ]);
        expect(interpreterSource).not.toMatch(
            /(?:world|terrain|camera|render|ui|document|canvas|geograph)/i
        );
    });
});

describe("listening history architecture", () => {
    it("depends only on the Music domain and never on CurrentBroadcast", () => {
        const source = `${listeningEventSource}\n${listeningHistorySource}`;
        const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(([, path]) => path);

        expect(imports.every((path) => path.startsWith("."))).toBe(true);
        expect(source).not.toMatch(
            /(?:knowledge|world|terrain|camera|render|ui|app|CurrentBroadcast|geograph)/i
        );
    });
});

describe("temporal Music architecture", () => {
    it("depends only on Music and never on CurrentBroadcast or generic layers", () => {
        const imports = [...temporalProjectorSource.matchAll(/from\s+["']([^"']+)["']/g)].map(
            ([, path]) => path
        );

        expect(imports.every((path) => path.startsWith("."))).toBe(true);
        expect(imports).not.toEqual(
            expect.arrayContaining([
                expect.stringMatching(
                    /(?:knowledge|world|terrain|camera|render|ui|app|CurrentBroadcast|geograph)/i
                ),
            ])
        );
        expect(temporalProjectorSource).not.toContain("CurrentBroadcast");
        expect(temporalProjectorSource).not.toMatch(/Date\.now|new Date/);
    });
});
