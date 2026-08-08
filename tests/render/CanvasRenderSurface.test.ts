import { describe, expect, it } from "vitest";

import { CanvasRenderSurface } from "../../src/render";

interface CanvasFixture {
    readonly canvas: HTMLCanvasElement;
    readonly operations: string[];
    readonly state: {
        fillStyle: string | CanvasGradient | CanvasPattern;
        strokeStyle: string | CanvasGradient | CanvasPattern;
        lineWidth: number;
        globalAlpha: number;
        font: string;
        lineJoin: CanvasLineJoin;
        lineCap: CanvasLineCap;
    };
}

function fixture(hasContext = true): CanvasFixture {
    const operations: string[] = [];
    const state = {
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        globalAlpha: 1,
        font: "",
        lineJoin: "miter" as CanvasLineJoin,
        lineCap: "butt" as CanvasLineCap,
    };
    const context = {
        ...state,
        setTransform: (...values: readonly number[]) =>
            operations.push(`transform:${values.join(",")}`),
        fillRect: (...values: readonly number[]) => operations.push(`rect:${values.join(",")}`),
        save: () => operations.push("save"),
        restore: () => operations.push("restore"),
        beginPath: () => operations.push("begin"),
        moveTo: (...values: readonly number[]) => operations.push(`move:${values.join(",")}`),
        lineTo: (...values: readonly number[]) => operations.push(`line:${values.join(",")}`),
        quadraticCurveTo: (...values: readonly number[]) =>
            operations.push(`quadratic:${values.join(",")}`),
        stroke: () => operations.push("stroke"),
        arc: (...values: readonly number[]) => operations.push(`arc:${values.join(",")}`),
        fill: () => operations.push("fill"),
        fillText: (text: string, ...values: readonly number[]) =>
            operations.push(`text:${text}:${values.join(",")}`),
        strokeText: (text: string, ...values: readonly number[]) =>
            operations.push(`strokeText:${text}:${values.join(",")}`),
        measureText: (text: string) => ({
            width: text.length * 6,
            actualBoundingBoxAscent: 9,
            actualBoundingBoxDescent: 3,
        }),
    };
    const canvas = {
        width: 0,
        height: 0,
        style: { width: "", height: "" },
        getContext: () => (hasContext ? context : null),
    } as unknown as HTMLCanvasElement;

    return { canvas, operations, state: context };
}

describe("CanvasRenderSurface", () => {
    it("requires a Canvas 2D context", () => {
        expect(() => new CanvasRenderSurface(fixture(false).canvas)).toThrow(
            "Canvas 2D context is unavailable."
        );
    });

    it("resizes CSS and backing-store dimensions using device pixel ratio", () => {
        const value = fixture();
        const surface = new CanvasRenderSurface(value.canvas);

        surface.resize(320.5, 200.25, 2);

        expect(surface.width).toBe(320.5);
        expect(surface.height).toBe(200.25);
        expect(value.canvas.style.width).toBe("320.5px");
        expect(value.canvas.style.height).toBe("200.25px");
        expect(value.canvas.width).toBe(641);
        expect(value.canvas.height).toBe(401);
        expect(value.operations).toContain("transform:2,0,0,2,0,0");
    });

    it.each([1, 1.25, 3])("replaces rather than accumulates DPR transform %s", (ratio) => {
        const value = fixture();
        const surface = new CanvasRenderSurface(value.canvas);

        surface.resize(100, 50, ratio);
        surface.resize(100, 50, ratio);

        expect(value.canvas.width).toBe(Math.round(100 * ratio));
        expect(value.canvas.height).toBe(Math.round(50 * ratio));
        expect(value.operations.filter((operation) => operation.startsWith("transform:"))).toEqual([
            `transform:${ratio},0,0,${ratio},0,0`,
            `transform:${ratio},0,0,${ratio},0,0`,
        ]);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects invalid resize values %s",
        (invalid) => {
            const surface = new CanvasRenderSurface(fixture().canvas);
            expect(() => surface.resize(invalid, 1, 1)).toThrow(RangeError);
            expect(() => surface.resize(1, invalid, 1)).toThrow(RangeError);
            expect(() => surface.resize(1, 1, invalid)).toThrow(RangeError);
        }
    );

    it("rejects unsafe backing-store dimensions", () => {
        const surface = new CanvasRenderSurface(fixture().canvas);

        expect(() => surface.resize(Number.MAX_SAFE_INTEGER, 1, 2)).toThrow(
            "Canvas backing-store dimensions must be safe integers."
        );
    });

    it("adapts every minimal drawing operation", () => {
        const value = fixture();
        const surface = new CanvasRenderSurface(value.canvas);

        surface.fillRect(1, 2, 3, 4, "red");
        surface.strokeLine(1, 2, 3, 4, "blue", 5, 0.5);
        surface.strokeQuadraticCurve(1, 2, 3, 4, 5, 6, "ochre", 2, 0.7);
        surface.fillCircle(6, 7, 8, "orange", "brown", 2);
        surface.fillText("node-a", 9, 10, "black", "12px serif", "cream", 3);

        expect(value.operations).toEqual([
            "save",
            "rect:1,2,3,4",
            "restore",
            "save",
            "begin",
            "move:1,2",
            "line:3,4",
            "stroke",
            "restore",
            "save",
            "begin",
            "move:1,2",
            "quadratic:3,4,5,6",
            "stroke",
            "restore",
            "save",
            "begin",
            `arc:6,7,8,0,${Math.PI * 2}`,
            "fill",
            "stroke",
            "restore",
            "save",
            "strokeText:node-a:9,10",
            "text:node-a:9,10",
            "restore",
        ]);
    });

    it("measures text using the selected font without leaking Canvas state", () => {
        const value = fixture();
        const surface = new CanvasRenderSurface(value.canvas);

        expect(surface.measureText("Atlas", "12px serif")).toEqual({
            width: 30,
            ascent: 9,
            descent: 3,
        });
        expect(value.operations).toEqual(["save", "restore"]);
    });
});
