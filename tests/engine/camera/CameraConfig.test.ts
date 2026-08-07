import { describe, expect, it } from "vitest";

import { CameraConfig, type CameraConfigOptions } from "../../../src/engine/camera";

function options(overrides: Partial<CameraConfigOptions> = {}): CameraConfigOptions {
    return {
        viewportWidth: 800,
        viewportHeight: 600,
        minZoom: 0.5,
        maxZoom: 4,
        initialZoom: 2,
        ...overrides,
    };
}

describe("CameraConfig", () => {
    it("creates an immutable configuration", () => {
        const source = options();
        const config = new CameraConfig(source);

        expect(config).toEqual(options());
        expect(Object.isFrozen(config)).toBe(true);
        Object.assign(source, { viewportWidth: 1, initialZoom: 0.5 });
        expect(config.viewportWidth).toBe(800);
        expect(config.initialZoom).toBe(2);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid viewport width %s",
        (viewportWidth) => {
            expect(() => new CameraConfig(options({ viewportWidth }))).toThrow(RangeError);
        }
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid viewport height %s",
        (viewportHeight) => {
            expect(() => new CameraConfig(options({ viewportHeight }))).toThrow(RangeError);
        }
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid minimum zoom %s",
        (minZoom) => {
            expect(() => new CameraConfig(options({ minZoom }))).toThrow(RangeError);
        }
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid maximum zoom %s",
        (maxZoom) => {
            expect(() => new CameraConfig(options({ maxZoom }))).toThrow(RangeError);
        }
    );

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects the invalid initial zoom %s",
        (initialZoom) => {
            expect(() => new CameraConfig(options({ initialZoom }))).toThrow(RangeError);
        }
    );

    it("rejects inverted zoom bounds", () => {
        expect(() => new CameraConfig(options({ minZoom: 5, maxZoom: 4 }))).toThrow(
            "minZoom must be less than or equal to maxZoom."
        );
    });

    it.each([0.25, 5])("rejects the out-of-range initial zoom %s", (initialZoom) => {
        expect(() => new CameraConfig(options({ initialZoom }))).toThrow(
            "initialZoom must be in [minZoom, maxZoom]."
        );
    });

    it("accepts equal zoom bounds and a fractional viewport", () => {
        const config = new CameraConfig(
            options({ viewportWidth: 1.5, viewportHeight: 2.5, minZoom: 2, maxZoom: 2 })
        );

        expect(config.initialZoom).toBe(2);
    });
});
