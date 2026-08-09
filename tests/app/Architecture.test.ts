/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import cameraJourneySource from "../../src/app/CameraJourney.ts?raw";
import interactionSource from "../../src/engine/interaction/CameraInteractionController.ts?raw";
import navigableMapSource from "../../src/app/NavigableMap.ts?raw";
import mainSource from "../../src/main.ts?raw";
import rendererSource from "../../src/render/CanvasRenderer.ts?raw";
import shellSource from "../../src/ui/SeventiesHomeShell.ts?raw";
import uiTextSource from "../../src/app/UiText.ts?raw";

describe("First Navigable Map architecture", () => {
    it("keeps interaction independent from browser and application modules", () => {
        const imports = [...interactionSource.matchAll(/from\s+["']([^"']+)["']/g)].map(
            ([, path]) => path
        );
        expect(imports).toEqual(["../camera"]);
        expect(interactionSource).not.toMatch(
            /DOM|MouseEvent|PointerEvent|WheelEvent|document|window/
        );
        expect(interactionSource).not.toMatch(/analytics|tracking/i);
    });

    it("keeps Camera journey timing in app and independent from domain modules", () => {
        const imports = [...cameraJourneySource.matchAll(/from\s+["']([^"']+)["']/g)].map(
            ([, path]) => path
        );
        expect(imports).toEqual(["../engine/camera"]);
        expect(cameraJourneySource).not.toMatch(/analytics|tracking/i);
        expect(navigableMapSource).toContain("requestAnimationFrame");
    });

    it("keeps render independent from Music", () => {
        expect(rendererSource).not.toMatch(/from ["']\.\.\/music/);
    });

    it("places browser bindings in app and keeps main thin", () => {
        expect(navigableMapSource).toContain("CameraInteractionController");
        expect(navigableMapSource).toContain("CanvasRenderer");
        expect(navigableMapSource).toContain("addEventListener");
        expect(navigableMapSource).toContain("removeEventListener");
        expect(mainSource.split("\n").length).toBeLessThanOrEqual(12);
    });

    it("centralizes the user-facing copy introduced by this phase in app", () => {
        expect(uiTextSource).toContain("Drag to explore · Scroll to zoom");
        expect(uiTextSource).toContain("EchoAtlas navigable music atlas");
        expect(uiTextSource).toContain("Cartographie musicale");
        expect(uiTextSource).toContain("Votre voyage");
        expect(navigableMapSource).not.toMatch(
            /Drag to explore|Scroll to zoom|navigable music atlas/
        );
        expect(shellSource).not.toMatch(/Cartographie musicale|Votre voyage|Zoom avant/);
        expect(interactionSource).not.toMatch(/Drag to explore|Scroll to zoom/);
        expect(rendererSource).not.toMatch(/Drag to explore|Scroll to zoom/);
    });
});
