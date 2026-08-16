/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import contentSource from "../../src/world/GeographicContent.ts?raw";
import featureSource from "../../src/world/GeographicFeature.ts?raw";
import hierarchySource from "../../src/world/GeographicHierarchy.ts?raw";
import focusResolverSource from "../../src/world/GeographicFocusResolver.ts?raw";
import layoutSource from "../../src/world/GeographicLayout.ts?raw";
import spatialFocusSource from "../../src/world/GeographicSpatialFocus.ts?raw";
import layoutGeneratorSource from "../../src/world/GeographicLayoutGenerator.ts?raw";
import layoutGeneratorConfigSource from "../../src/world/GeographicLayoutGeneratorConfig.ts?raw";
import appearanceSource from "../../src/world/GeographicAppearanceSnapshot.ts?raw";
import featureAppearanceSource from "../../src/world/GeographicFeatureAppearance.ts?raw";

describe("semantic geography architecture", () => {
    it("keeps hierarchical geography inside World and independent from Music and Render", () => {
        const source = `${featureSource}\n${contentSource}\n${hierarchySource}\n${focusResolverSource}\n${layoutSource}\n${spatialFocusSource}\n${layoutGeneratorSource}\n${layoutGeneratorConfigSource}\n${appearanceSource}\n${featureAppearanceSource}`;
        expect(source).not.toMatch(/from ["'][^"']*(?:music|render)[^"']*["']/i);
        expect(source).not.toMatch(/music:|artist|album|track|playlist|label/i);
    });

    it("contains no geometry, implicit time or unresolved City runtime role", () => {
        const source = `${featureSource}\n${contentSource}\n${hierarchySource}`;
        expect(source).not.toMatch(/Date\.now|new Date|Math\.random|system clock/i);
        expect(source).not.toMatch(/\b(?:x|y|latitude|longitude|elevation|terrain)\b/);
        expect(featureSource).not.toMatch(/["']city["']/);
    });

    it("keeps geographic appearance generic and free of time or Music semantics", () => {
        const source = `${appearanceSource}\n${featureAppearanceSource}`;
        const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(([, path]) => path);

        expect(imports.every((path) => path.startsWith("./"))).toBe(true);
        expect(source).not.toMatch(
            /artist|album|track|playlist|Date\.now|new Date|elapsed|threshold/i
        );
    });
});
