import { describe, expect, it } from "vitest";

import { createDemoSemanticMusicExtension } from "../../src/app/demoSemanticMusicExtension";

describe("demo semantic Music extension", () => {
    it("declares the approved showcase Genres and assignments exactly", () => {
        const extension = createDemoSemanticMusicExtension();

        expect(
            extension.getEntities().map(({ kind, id, name, tags }) => ({ kind, id, name, tags }))
        ).toEqual([
            { kind: "genre", id: "afrobeat", name: "Afrobeat", tags: undefined },
            { kind: "genre", id: "electronic", name: "Electronic", tags: undefined },
            { kind: "genre", id: "folk", name: "Folk", tags: undefined },
            { kind: "genre", id: "rock", name: "Rock", tags: undefined },
            { kind: "genre", id: "soul", name: "Soul", tags: undefined },
        ]);
        expect(
            extension
                .getRelations()
                .map(({ sourceId, kind, targetId }) => `${sourceId}:${kind}:${targetId}`)
        ).toEqual([
            "afrobeat:includes:fela-kuti",
            "electronic:includes:brian-eno",
            "electronic:includes:david-bowie",
            "electronic:includes:kraftwerk",
            "folk:includes:joni-mitchell",
            "rock:includes:david-bowie",
            "rock:includes:fleetwood-mac",
            "soul:includes:gil-scott-heron",
            "soul:includes:stevie-wonder",
        ]);
    });
});
