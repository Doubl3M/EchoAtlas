import { describe, expect, it } from "vitest";

import { Camera2D, CameraConfig } from "../../src/engine/camera";
import { HeightField } from "../../src/engine/terrain";
import { CanvasRenderer, type RenderSurface, type VisualTheme } from "../../src/render";
import { GeographicWorld, WorldConnection, WorldLocation } from "../../src/world";

type Command = Readonly<{ readonly kind: string; readonly values: readonly unknown[] }>;

class RecordingSurface implements RenderSurface {
    public readonly commands: Command[] = [];

    public constructor(
        public readonly width = 100,
        public readonly height = 80
    ) {}

    public fillRect(x: number, y: number, width: number, height: number, color: string): void {
        this.record("fillRect", x, y, width, height, color);
    }

    public strokeLine(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        color: string,
        width: number,
        opacity: number
    ): void {
        this.record("strokeLine", startX, startY, endX, endY, color, width, opacity);
    }

    public fillCircle(
        x: number,
        y: number,
        radius: number,
        fillColor: string,
        strokeColor: string,
        strokeWidth: number
    ): void {
        this.record("fillCircle", x, y, radius, fillColor, strokeColor, strokeWidth);
    }

    public fillText(text: string, x: number, y: number, color: string, font: string): void {
        this.record("fillText", text, x, y, color, font);
    }

    private record(kind: string, ...values: readonly unknown[]): void {
        this.commands.push(Object.freeze({ kind, values: Object.freeze(values) }));
    }
}

function theme(prefix = "theme", labels = true): VisualTheme {
    return Object.freeze({
        backgroundColor: `${prefix}-background`,
        terrainBands: Object.freeze([
            Object.freeze({ maximum: 0.3, color: `${prefix}-low` }),
            Object.freeze({ maximum: 0.7, color: `${prefix}-middle` }),
            Object.freeze({ maximum: 1, color: `${prefix}-high` }),
        ]),
        connection: Object.freeze({ color: `${prefix}-connection`, width: 2, opacity: 0.5 }),
        location: Object.freeze({
            fillColor: `${prefix}-location-fill`,
            strokeColor: `${prefix}-location-stroke`,
            strokeWidth: 1,
            radius: 3,
        }),
        label: Object.freeze({
            enabled: labels,
            color: `${prefix}-label`,
            font: "12px serif",
            offsetX: 4,
            offsetY: -5,
        }),
    });
}

function location(id: string, x: number, y: number, elevation: number): WorldLocation {
    return new WorldLocation({ knowledgeNodeId: id, x, y, elevation }, 2, 2);
}

function connection(id: string, source: string, target: string): WorldConnection {
    return new WorldConnection({
        knowledgeRelationId: id,
        sourceKnowledgeNodeId: source,
        targetKnowledgeNodeId: target,
    });
}

function world(
    locations: readonly WorldLocation[] = [],
    connections: readonly WorldConnection[] = []
): GeographicWorld {
    return new GeographicWorld({
        width: 2,
        height: 2,
        heightField: new HeightField(2, 2, [0.1, 0.4, 0.7, 0.9]),
        locations,
        connections,
    });
}

function camera(): Camera2D {
    const value = new Camera2D(
        new CameraConfig({
            viewportWidth: 100,
            viewportHeight: 80,
            minZoom: 0.5,
            maxZoom: 20,
            initialZoom: 10,
        })
    );
    value.setPosition(0, 0);
    return value;
}

describe("CanvasRenderer", () => {
    it("rejects a theme without terrain bands", () => {
        expect(
            () => new CanvasRenderer(Object.freeze({ ...theme(), terrainBands: Object.freeze([]) }))
        ).toThrow("Terrain bands must cover elevations through 1.");
    });

    it.each([
        [[{ maximum: Number.NaN, color: "invalid" }], "finite and in [0, 1]"],
        [[{ maximum: -0.1, color: "invalid" }], "finite and in [0, 1]"],
        [[{ maximum: 1.1, color: "invalid" }], "finite and in [0, 1]"],
        [
            [
                { maximum: 0.7, color: "first" },
                { maximum: 0.5, color: "second" },
                { maximum: 1, color: "last" },
            ],
            "strictly increasing",
        ],
        [
            [
                { maximum: 0.5, color: "first" },
                { maximum: 0.5, color: "duplicate" },
                { maximum: 1, color: "last" },
            ],
            "strictly increasing",
        ],
        [[{ maximum: 0.9, color: "incomplete" }], "cover elevations through 1"],
    ] as const)("rejects invalid terrain bands %#", (terrainBands, message) => {
        expect(
            () =>
                new CanvasRenderer(
                    Object.freeze({ ...theme(), terrainBands: Object.freeze(terrainBands) })
                )
        ).toThrow(message);
    });

    it("selects exact cumulative band boundaries deterministically", () => {
        const boundaryWorld = new GeographicWorld({
            width: 2,
            height: 2,
            heightField: new HeightField(2, 2, [0, 0.3, 0.3000000001, 1]),
            locations: [],
            connections: [],
        });
        const surface = new RecordingSurface();

        new CanvasRenderer(theme()).render(boundaryWorld, camera(), surface);

        expect(surface.commands.slice(1).map(({ values }) => values[4])).toEqual([
            "theme-low",
            "theme-low",
            "theme-middle",
            "theme-high",
        ]);
    });

    it("renders an empty world as background then deterministic terrain", () => {
        const surface = new RecordingSurface();

        new CanvasRenderer(theme()).render(world(), camera(), surface);

        expect(surface.commands).toEqual([
            { kind: "fillRect", values: [0, 0, 100, 80, "theme-background"] },
            { kind: "fillRect", values: [50, 40, 10, 10, "theme-low"] },
            { kind: "fillRect", values: [60, 40, 10, 10, "theme-middle"] },
            { kind: "fillRect", values: [50, 50, 10, 10, "theme-middle"] },
            { kind: "fillRect", values: [60, 50, 10, 10, "theme-high"] },
        ]);
    });

    it("renders layers in background, terrain, connections, locations, labels order", () => {
        const locations = [location("A", 0, 0, 0.2), location("B", 1, 1, 0.8)];
        const connections = [connection("R", "A", "B")];
        const surface = new RecordingSurface();

        new CanvasRenderer(theme()).render(world(locations, connections), camera(), surface);

        expect(surface.commands.map(({ kind }) => kind)).toEqual([
            "fillRect",
            "fillRect",
            "fillRect",
            "fillRect",
            "fillRect",
            "strokeLine",
            "fillCircle",
            "fillCircle",
            "fillText",
            "fillText",
        ]);
        expect(surface.commands[5]).toEqual({
            kind: "strokeLine",
            values: [50, 40, 60, 50, "theme-connection", 2, 0.5],
        });
        expect(surface.commands[6]).toEqual({
            kind: "fillCircle",
            values: [50, 40, 3, "theme-location-fill", "theme-location-stroke", 1],
        });
        expect(surface.commands[8]).toEqual({
            kind: "fillText",
            values: ["A", 54, 35, "theme-label", "12px serif"],
        });
    });

    it("uses Camera2D for every world coordinate including off-viewport positions", () => {
        const value = camera();
        value.setPosition(100, -100);
        const surface = new RecordingSurface();

        new CanvasRenderer(theme()).render(world([location("A", 1, 1, 0.5)]), value, surface);

        expect(surface.commands.find(({ kind }) => kind === "fillCircle")).toEqual({
            kind: "fillCircle",
            values: [-940, 1050, 3, "theme-location-fill", "theme-location-stroke", 1],
        });
    });

    it("renders a 1 × 1 world", () => {
        const oneCellWorld = new GeographicWorld({
            width: 1,
            height: 1,
            heightField: new HeightField(1, 1, [1]),
            locations: [
                new WorldLocation({ knowledgeNodeId: "A", x: 0, y: 0, elevation: 1 }, 1, 1),
            ],
            connections: [],
        });
        const surface = new RecordingSurface();

        new CanvasRenderer(theme()).render(oneCellWorld, camera(), surface);

        expect(surface.commands.map(({ kind }) => kind)).toEqual([
            "fillRect",
            "fillRect",
            "fillCircle",
            "fillText",
        ]);
    });

    it("preserves self-relations and parallel relations as distinct commands", () => {
        const locations = [location("A", 0, 0, 0.2), location("B", 1, 1, 0.8)];
        const connections = [
            connection("R1", "A", "A"),
            connection("R2", "A", "B"),
            connection("R3", "A", "B"),
        ];
        const surface = new RecordingSurface();

        new CanvasRenderer(theme()).render(world(locations, connections), camera(), surface);

        expect(surface.commands.filter(({ kind }) => kind === "strokeLine")).toHaveLength(3);
        expect(surface.commands.filter(({ kind }) => kind === "strokeLine")[0]).toEqual({
            kind: "strokeLine",
            values: [50, 40, 50, 40, "theme-connection", 2, 0.5],
        });
    });

    it("refuses an incoherent connection defensively", () => {
        const invalidWorld = {
            width: 1,
            height: 1,
            heightField: new HeightField(1, 1, [0]),
            getConnections: () => [connection("R", "missing", "missing")],
            getLocations: () => [],
            getLocationByKnowledgeNodeId: () => undefined,
        } as unknown as GeographicWorld;

        expect(() =>
            new CanvasRenderer(theme()).render(invalidWorld, camera(), new RecordingSurface())
        ).toThrow("Connection R has no location.");
    });

    it("can disable labels through the theme", () => {
        const surface = new RecordingSurface();

        new CanvasRenderer(theme("quiet", false)).render(
            world([location("A", 0, 0, 0.5)]),
            camera(),
            surface
        );

        expect(surface.commands.some(({ kind }) => kind === "fillText")).toBe(false);
    });

    it("does not mutate the world or camera and is repeatable", () => {
        const geographicWorld = world(
            [location("A", 0, 0, 0.2), location("B", 1, 1, 0.8)],
            [connection("R", "A", "B")]
        );
        const value = camera();
        const locationsBefore = [...geographicWorld.getLocations()];
        const connectionsBefore = [...geographicWorld.getConnections()];
        const terrainBefore = geographicWorld.heightField.toArray();
        const positionBefore = value.getPosition();
        const zoomBefore = value.getZoom();
        const first = new RecordingSurface();
        const second = new RecordingSurface();
        const renderer = new CanvasRenderer(theme());

        renderer.render(geographicWorld, value, first);
        renderer.render(geographicWorld, value, second);

        expect(second.commands).toEqual(first.commands);
        expect(geographicWorld.getLocations()).toEqual(locationsBefore);
        expect(geographicWorld.getConnections()).toEqual(connectionsBefore);
        expect(geographicWorld.heightField.toArray()).toEqual(terrainBefore);
        expect(value.getPosition()).toEqual(positionBefore);
        expect(value.getZoom()).toBe(zoomBefore);
    });

    it("changes appearance by theme injection without changing world or renderer logic", () => {
        const geographicWorld = world([location("A", 0, 0, 0.5)]);
        const value = camera();
        const first = new RecordingSurface();
        const second = new RecordingSurface();
        const worldBefore = geographicWorld.getLocations();

        new CanvasRenderer(theme("A")).render(geographicWorld, value, first);
        new CanvasRenderer(theme("B")).render(geographicWorld, value, second);

        expect(second.commands).not.toEqual(first.commands);
        expect(geographicWorld.getLocations()).toBe(worldBefore);
        expect(value.getPosition()).toEqual({ x: 0, y: 0 });
    });
});
