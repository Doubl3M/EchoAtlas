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

    public drawRaster(
        raster: {
            readonly width: number;
            readonly height: number;
            readonly colors: readonly string[];
        },
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.record("drawRaster", raster, x, y, width, height);
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

    public strokeQuadraticCurve(
        startX: number,
        startY: number,
        controlX: number,
        controlY: number,
        endX: number,
        endY: number,
        color: string,
        width: number,
        opacity: number
    ): void {
        this.record(
            "strokeQuadraticCurve",
            startX,
            startY,
            controlX,
            controlY,
            endX,
            endY,
            color,
            width,
            opacity
        );
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

    public fillText(
        text: string,
        x: number,
        y: number,
        color: string,
        font: string,
        haloColor: string,
        haloWidth: number
    ): void {
        this.record("fillText", text, x, y, color, font, haloColor, haloWidth);
    }

    public measureText(text: string): { width: number; ascent: number; descent: number } {
        return { width: text.length * 6, ascent: 9, descent: 3 };
    }

    private record(kind: string, ...values: readonly unknown[]): void {
        this.commands.push(Object.freeze({ kind, values: Object.freeze(values) }));
    }
}

function theme(prefix = "theme", labels = true, labelMinZoom = 0): VisualTheme {
    return Object.freeze({
        backgroundColor: `${prefix}-background`,
        backgroundTexture: Object.freeze({
            enabled: false,
            color: `${prefix}-texture`,
            spacing: 20,
            size: 1,
        }),
        terrainBands: Object.freeze([
            Object.freeze({ maximum: 0.3, color: `${prefix}-low` }),
            Object.freeze({ maximum: 0.7, color: `${prefix}-middle` }),
            Object.freeze({ maximum: 1, color: `${prefix}-high` }),
        ]),
        terrain: Object.freeze({
            cellOverlap: 0,
            rasterScale: 1,
            contour: Object.freeze({
                enabled: false,
                color: `${prefix}-contour`,
                width: 1,
                opacity: 0.2,
            }),
            water: Object.freeze({
                maximum: 0.3,
                shorelineColor: `${prefix}-shoreline`,
                shorelineWidth: 1,
                shorelineOpacity: 0,
            }),
            ornaments: Object.freeze({
                enabled: false,
                spacing: 10,
                density: 0,
                reliefMinimum: 0.8,
                waterColor: `${prefix}-water-mark`,
                reliefColor: `${prefix}-relief-mark`,
                width: 1,
                opacity: 0,
                size: 2,
            }),
        }),
        connection: Object.freeze({
            color: `${prefix}-connection`,
            width: 2,
            opacity: 0.5,
            casingColor: `${prefix}-casing`,
            casingWidth: 0,
            casingOpacity: 0,
            curveStrength: 0,
        }),
        location: Object.freeze({
            fillColor: `${prefix}-location-fill`,
            strokeColor: `${prefix}-location-stroke`,
            strokeWidth: 1,
            radius: 3,
            centerColor: `${prefix}-location-center`,
            centerRadius: 0,
        }),
        landmarks: Object.freeze({
            city: Object.freeze({
                enabled: true,
                detailZoom: 12,
                compactWidth: 10,
                compactHeight: 8,
                detailedWidth: 16,
                detailedHeight: 12,
                widthVariation: 0.1,
                fillColor: `${prefix}-city-fill`,
                secondaryColor: `${prefix}-city-secondary`,
                detailColor: `${prefix}-city-detail`,
                strokeColor: `${prefix}-city-stroke`,
                strokeWidth: 1,
                labelGap: 2,
                hitPadding: 3,
            }),
        }),
        label: Object.freeze({
            enabled: labels,
            minZoom: labelMinZoom,
            color: `${prefix}-label`,
            font: "12px serif",
            offsetX: 1,
            offsetY: -1,
            haloColor: `${prefix}-halo`,
            haloWidth: 0,
            collisionPadding: 2,
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

function spaciousWorld(): GeographicWorld {
    return new GeographicWorld({
        width: 10,
        height: 10,
        heightField: new HeightField(1, 1, [0.5]),
        locations: [
            new WorldLocation({ knowledgeNodeId: "A", x: 3, y: 4, elevation: 0.5 }, 10, 10),
            new WorldLocation({ knowledgeNodeId: "B", x: 7, y: 6, elevation: 0.5 }, 10, 10),
        ],
        connections: [],
    });
}

function spaciousCamera(): Camera2D {
    const value = camera();
    value.setPosition(5, 5);
    value.setZoom(8);
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

        expect(
            (surface.commands[1]?.values[0] as { readonly colors: readonly string[] }).colors
        ).toEqual(["theme-low", "theme-low", "theme-middle", "theme-high"]);
    });

    it("creates a deterministic bilinearly sampled visual raster without mutating terrain", () => {
        const base = theme("smooth");
        const smoothTheme = Object.freeze({
            ...base,
            terrain: Object.freeze({ ...base.terrain, rasterScale: 2 }),
        });
        const terrainWorld = world();
        const before = terrainWorld.heightField.toArray();
        const first = new RecordingSurface();
        const second = new RecordingSurface();

        const renderer = new CanvasRenderer(smoothTheme);
        renderer.render(terrainWorld, camera(), first);
        renderer.render(terrainWorld, camera(), second);

        const firstRaster = first.commands[1]?.values[0] as {
            readonly width: number;
            readonly height: number;
            readonly colors: readonly string[];
        };
        const secondRaster = second.commands[1]?.values[0] as typeof firstRaster;
        expect([firstRaster.width, firstRaster.height, firstRaster.colors.length]).toEqual([
            4, 4, 16,
        ]);
        expect(firstRaster.colors).toEqual(secondRaster.colors);
        expect(terrainWorld.heightField.toArray()).toEqual(before);
    });

    it.each([0, 1.5, 9])("rejects invalid terrain raster scale %s", (rasterScale) => {
        const base = theme();
        expect(
            () =>
                new CanvasRenderer(
                    Object.freeze({
                        ...base,
                        terrain: Object.freeze({ ...base.terrain, rasterScale }),
                    })
                )
        ).toThrow("Terrain raster scale");
    });

    it("renders an empty world as background then deterministic terrain", () => {
        const surface = new RecordingSurface();

        new CanvasRenderer(theme()).render(world(), camera(), surface);

        expect(surface.commands[0]).toEqual({
            kind: "fillRect",
            values: [0, 0, 100, 80, "theme-background"],
        });
        expect(surface.commands[1]?.kind).toBe("drawRaster");
        expect(surface.commands[1]?.values.slice(1)).toEqual([50, 40, 20, 20]);
    });

    it("renders terrain resolution cells across the complete logical World extent", () => {
        const decoupledWorld = new GeographicWorld({
            width: 8,
            height: 4,
            heightField: new HeightField(4, 2, [0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.9, 1]),
            locations: [],
            connections: [],
        });
        const surface = new RecordingSurface();

        new CanvasRenderer(theme()).render(decoupledWorld, camera(), surface);

        const terrain = surface.commands[1];
        expect(terrain?.kind).toBe("drawRaster");
        expect(terrain?.values.slice(1)).toEqual([50, 40, 80, 40]);
        const raster = terrain?.values[0] as {
            readonly width: number;
            readonly height: number;
            readonly colors: readonly string[];
        };
        expect([raster.width, raster.height, raster.colors.length]).toEqual([4, 2, 8]);
        expect(raster.colors[0]).toBe("theme-low");
        expect(raster.colors[7]).toBe("theme-high");
    });

    it("renders layers in background, terrain, connections, locations, labels order", () => {
        const locations = [location("A", 0, 0, 0.2), location("B", 1, 1, 0.8)];
        const connections = [connection("R", "A", "B")];
        const surface = new RecordingSurface();

        new CanvasRenderer(theme()).render(world(locations, connections), camera(), surface);

        expect(surface.commands.map(({ kind }) => kind)).toEqual([
            "fillRect",
            "drawRaster",
            "strokeLine",
            "fillCircle",
            "fillCircle",
            "fillText",
            "fillText",
        ]);
        expect(surface.commands[2]).toEqual({
            kind: "strokeLine",
            values: [50, 40, 60, 50, "theme-connection", 2, 0.5],
        });
        expect(surface.commands[3]).toEqual({
            kind: "fillCircle",
            values: [50, 40, 3, "theme-location-fill", "theme-location-stroke", 1],
        });
        expect(surface.commands[5]).toEqual({
            kind: "fillText",
            values: ["A", 51, 50, "theme-label", "12px serif", "theme-halo", 0],
        });
    });

    it("applies optional generic cartographic styling without knowing the theme identity", () => {
        const base = theme("atlas");
        const visualTheme: VisualTheme = Object.freeze({
            ...base,
            backgroundTexture: Object.freeze({
                enabled: true,
                color: "paper-grain",
                spacing: 50,
                size: 1,
            }),
            terrain: Object.freeze({
                ...base.terrain,
                cellOverlap: 0.5,
                contour: Object.freeze({
                    enabled: true,
                    color: "contour",
                    width: 0.5,
                    opacity: 0.2,
                }),
            }),
            connection: Object.freeze({
                ...base.connection,
                casingColor: "road-casing",
                casingWidth: 4,
                casingOpacity: 0.3,
                curveStrength: 6,
            }),
            location: Object.freeze({
                ...base.location,
                centerColor: "location-center",
                centerRadius: 1,
            }),
            label: Object.freeze({
                ...base.label,
                haloColor: "label-halo",
                haloWidth: 3,
            }),
        });
        const surface = new RecordingSurface();

        new CanvasRenderer(visualTheme).render(
            world(
                [location("A", 0, 0, 0.2), location("B", 1, 1, 0.8)],
                [connection("R", "A", "B")]
            ),
            camera(),
            surface
        );

        expect(surface.commands.some(({ values }) => values.includes("paper-grain"))).toBe(true);
        expect(surface.commands.some(({ values }) => values.includes("contour"))).toBe(true);
        expect(surface.commands.some(({ values }) => values.includes("road-casing"))).toBe(true);
        expect(surface.commands.some(({ kind }) => kind === "strokeQuadraticCurve")).toBe(true);
        expect(surface.commands.some(({ values }) => values.includes("location-center"))).toBe(
            true
        );
        expect(surface.commands.some(({ values }) => values.includes("label-halo"))).toBe(true);
    });

    it("renders deterministic optional terrain ornaments below routes and labels", () => {
        const base = theme("ornament");
        const ornamentTheme = Object.freeze({
            ...base,
            terrain: Object.freeze({
                ...base.terrain,
                ornaments: Object.freeze({
                    ...base.terrain.ornaments,
                    enabled: true,
                    spacing: 1,
                    density: 1,
                    reliefMinimum: 0.8,
                    opacity: 0.5,
                }),
            }),
        });
        const first = new RecordingSurface();
        const second = new RecordingSurface();
        const renderer = new CanvasRenderer(ornamentTheme);
        const terrainWorld = world(
            [location("A", 0, 0, 0.2), location("B", 1, 1, 0.8)],
            [connection("R", "A", "B")]
        );

        renderer.render(terrainWorld, camera(), first);
        renderer.render(terrainWorld, camera(), second);

        expect(first.commands).toEqual(second.commands);
        const ornamentIndex = first.commands.findIndex(({ values }) =>
            values.includes("ornament-water-mark")
        );
        const routeIndex = first.commands.findIndex(({ values }) =>
            values.includes("ornament-connection")
        );
        expect(ornamentIndex).toBeGreaterThan(1);
        expect(ornamentIndex).toBeLessThan(routeIndex);
    });

    it("renders a generic city landmark deterministically from canonical identity", () => {
        const cityProvider = (id: string) => ({
            text: id,
            priority: 10,
            minZoom: 0,
            landmarkKind: "city" as const,
        });
        const first = new RecordingSurface();
        const second = new RecordingSurface();
        const different = new RecordingSurface();
        const renderer = new CanvasRenderer(theme("city"), cityProvider);

        renderer.render(world([location("A", 0, 0, 0.5)]), camera(), first);
        renderer.render(world([location("A", 0, 0, 0.5)]), camera(), second);
        renderer.render(world([location("different-city", 0, 0, 0.5)]), camera(), different);

        expect(first.commands).toEqual(second.commands);
        expect(first.commands).not.toEqual(different.commands);
        expect(first.commands.some(({ values }) => values.includes("city-city-fill"))).toBe(true);
        expect(first.commands.some(({ values }) => values.includes("city-location-fill"))).toBe(
            false
        );
    });

    it("adds deterministic city detail only after the theme zoom threshold", () => {
        const provider = () => ({
            text: "A",
            priority: 10,
            minZoom: 0,
            landmarkKind: "city" as const,
        });
        const compactSurface = new RecordingSurface();
        const detailedSurface = new RecordingSurface();
        const compactCamera = camera();
        const detailedCamera = camera();
        detailedCamera.setZoom(15);
        const renderer = new CanvasRenderer(theme("lod"), provider);

        renderer.render(world([location("A", 0, 0, 0.5)]), compactCamera, compactSurface);
        renderer.render(world([location("A", 0, 0, 0.5)]), detailedCamera, detailedSurface);

        expect(detailedSurface.commands.length).toBeGreaterThan(compactSurface.commands.length);
    });

    it("keeps a detailed city label outside the landmark silhouette", () => {
        const visualTheme = theme("label-clearance");
        const value = camera();
        value.setZoom(15);
        const surface = new RecordingSurface();

        new CanvasRenderer(visualTheme, () => ({
            text: "A",
            priority: 10,
            minZoom: 0,
            landmarkKind: "city",
        })).render(world([location("A", 0, 0, 0.5)]), value, surface);

        const label = surface.commands.find(({ kind }) => kind === "fillText");
        const center = value.worldToScreen(0, 0);
        const maximumHalfWidth =
            (visualTheme.landmarks.city.detailedWidth *
                (1 + visualTheme.landmarks.city.widthVariation)) /
            2;
        const labelLeft = Number(label?.values[1]);
        const labelRight = labelLeft + surface.measureText("A").width;

        expect(label).toBeDefined();
        expect(
            labelRight <= center.x - maximumHalfWidth || labelLeft >= center.x + maximumHalfWidth
        ).toBe(true);
    });

    it("can disable city landmarks through the theme and fall back to a marker", () => {
        const base = theme("disabled-city");
        const disabled = Object.freeze({
            ...base,
            landmarks: Object.freeze({
                city: Object.freeze({ ...base.landmarks.city, enabled: false }),
            }),
        });
        const surface = new RecordingSurface();

        new CanvasRenderer(disabled, () => ({
            text: "A",
            priority: 10,
            minZoom: 0,
            landmarkKind: "city",
        })).render(world([location("A", 0, 0, 0.5)]), camera(), surface);

        expect(
            surface.commands.some(({ values }) => values.includes("disabled-city-location-fill"))
        ).toBe(true);
        expect(
            surface.commands.some(({ values }) => values.includes("disabled-city-city-fill"))
        ).toBe(false);
    });

    it("does not render a location whose label cannot fit in the visible World", () => {
        const value = camera();
        value.setPosition(100, -100);
        const surface = new RecordingSurface();

        new CanvasRenderer(theme("hidden-city"), () => ({
            text: "Hidden city",
            priority: 1,
            minZoom: 0,
            landmarkKind: "city",
        })).render(world([location("A", 1, 1, 0.5)]), value, surface);

        expect(surface.commands.some(({ kind }) => kind === "fillCircle")).toBe(false);
        expect(
            surface.commands.some(({ values }) => values.includes("hidden-city-city-fill"))
        ).toBe(false);
        expect(surface.commands.some(({ kind }) => kind === "fillText")).toBe(false);
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

        expect(surface.commands.map(({ kind }) => kind)).toEqual(["fillRect", "drawRaster"]);
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
            width: 2,
            height: 2,
            heightField: new HeightField(1, 1, [0]),
            getConnections: () => [connection("R", "A", "B")],
            getLocations: () => [location("A", 0, 0, 0.5), location("B", 1, 1, 0.5)],
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

    it("hides only labels below the theme zoom threshold", () => {
        const locations = [location("A", 0, 0, 0.2), location("B", 1, 1, 0.8)];
        const connections = [connection("R", "A", "B")];
        const surface = new RecordingSurface();
        const value = camera();
        value.setZoom(4);

        new CanvasRenderer(theme("lod", true, 5)).render(
            world(locations, connections),
            value,
            surface
        );

        expect(surface.commands.some(({ kind }) => kind === "fillText")).toBe(false);
        expect(surface.commands.filter(({ kind }) => kind === "fillCircle")).toHaveLength(0);
        expect(surface.commands.filter(({ kind }) => kind === "strokeLine")).toHaveLength(0);
    });

    it.each([8, 10])("renders labels at or above the theme threshold: zoom %s", (zoom) => {
        const surface = new RecordingSurface();
        const value = camera();
        value.setZoom(zoom);

        new CanvasRenderer(theme("lod", true, 8)).render(
            world([location("A", 0, 0, 0.5)]),
            value,
            surface
        );

        expect(surface.commands.filter(({ kind }) => kind === "fillText")).toHaveLength(1);
    });

    it("lets another theme change the label threshold without renderer changes", () => {
        const geographicWorld = world([location("A", 0, 0, 0.5)]);
        const value = camera();
        value.setZoom(10);
        const visible = new RecordingSurface();
        const hidden = new RecordingSurface();

        new CanvasRenderer(theme("early", true, 8)).render(geographicWorld, value, visible);
        new CanvasRenderer(theme("late", true, 11)).render(geographicWorld, value, hidden);

        expect(visible.commands.some(({ kind }) => kind === "fillText")).toBe(true);
        expect(hidden.commands.some(({ kind }) => kind === "fillText")).toBe(false);
    });

    it("keeps labels disabled at every zoom and does not mutate Camera or Theme", () => {
        const visualTheme = theme("disabled", false, 5);
        const value = camera();
        value.setZoom(20);
        const positionBefore = value.getPosition();
        const zoomBefore = value.getZoom();
        const labelBefore = { ...visualTheme.label };
        const surface = new RecordingSurface();

        new CanvasRenderer(visualTheme).render(world([location("A", 0, 0, 0.5)]), value, surface);

        expect(surface.commands.some(({ kind }) => kind === "fillText")).toBe(false);
        expect(value.getPosition()).toEqual(positionBefore);
        expect(value.getZoom()).toBe(zoomBefore);
        expect(visualTheme.label).toEqual(labelBefore);
    });

    it("accepts interchangeable generic label providers with an explicit ID fallback", () => {
        const geographicWorld = spaciousWorld();
        const first = new RecordingSurface();
        const second = new RecordingSurface();

        new CanvasRenderer(theme(), (id) =>
            id === "A" ? { text: "Alpha", priority: 2, minZoom: 0 } : undefined
        ).render(geographicWorld, spaciousCamera(), first);
        new CanvasRenderer(theme(), (id) => ({
            text: `X ${id}`,
            priority: 1,
            minZoom: 0,
        })).render(geographicWorld, spaciousCamera(), second);

        expect(
            first.commands.filter(({ kind }) => kind === "fillText").map(({ values }) => values[0])
        ).toEqual(["Alpha", "B"]);
        expect(
            second.commands.filter(({ kind }) => kind === "fillText").map(({ values }) => values[0])
        ).toEqual(["X A", "X B"]);
        expect(
            geographicWorld.getLocations().map(({ knowledgeNodeId }) => knowledgeNodeId)
        ).toEqual(["A", "B"]);
    });

    it("declutters by priority and canonical identity with deterministic text metrics", () => {
        const geographicWorld = new GeographicWorld({
            width: 20,
            height: 20,
            heightField: new HeightField(1, 1, [0.5]),
            locations: [
                new WorldLocation({ knowledgeNodeId: "low", x: 0, y: 0, elevation: 0.5 }, 10, 10),
                new WorldLocation({ knowledgeNodeId: "high", x: 0, y: 0, elevation: 0.5 }, 10, 10),
            ],
            connections: [],
        });
        const surface = new RecordingSurface();

        new CanvasRenderer(theme(), (id) => ({
            text: id,
            priority: id === "high" ? 10 : 1,
            minZoom: 0,
        })).render(geographicWorld, spaciousCamera(), surface);

        expect(
            surface.commands
                .filter(({ kind }) => kind === "fillText")
                .map(({ values }) => values[0])
        ).toEqual(["high"]);
    });

    it("prioritizes a focused destination over zoom thresholds and colliding labels", () => {
        const geographicWorld = new GeographicWorld({
            width: 20,
            height: 20,
            heightField: new HeightField(1, 1, [0.5]),
            locations: [
                new WorldLocation(
                    { knowledgeNodeId: "ordinary", x: 10, y: 10, elevation: 0.5 },
                    20,
                    20
                ),
                new WorldLocation(
                    { knowledgeNodeId: "focused", x: 10, y: 10, elevation: 0.5 },
                    20,
                    20
                ),
            ],
            connections: [],
        });
        const value = spaciousCamera();
        value.setPosition(10, 10);
        value.setZoom(5);
        const surface = new RecordingSurface();
        const renderer = new CanvasRenderer(theme("focus", true, 10), (id) => ({
            text: id,
            priority: id === "ordinary" ? 100 : 1,
            minZoom: 20,
        }));

        renderer.render(geographicWorld, value, surface, "focused");

        expect(
            surface.commands
                .filter(({ kind }) => kind === "fillText")
                .map(({ values }) => values[0])
        ).toEqual(["focused"]);
        expect(surface.commands.filter(({ kind }) => kind === "fillCircle")).toHaveLength(1);
        expect(
            geographicWorld.getLocations().map(({ knowledgeNodeId }) => knowledgeNodeId)
        ).toEqual(["focused", "ordinary"]);
    });

    it("moves a border label to the opposite side instead of leaving the World", () => {
        const geographicWorld = new GeographicWorld({
            width: 10,
            height: 10,
            heightField: new HeightField(1, 1, [0.5]),
            locations: [
                new WorldLocation({ knowledgeNodeId: "edge", x: 9, y: 5, elevation: 0.5 }, 10, 10),
            ],
            connections: [],
        });
        const surface = new RecordingSurface();

        new CanvasRenderer(theme(), () => ({ text: "Edge", priority: 1, minZoom: 0 })).render(
            geographicWorld,
            spaciousCamera(),
            surface
        );

        const text = surface.commands.find(({ kind }) => kind === "fillText");
        expect(text).toBeDefined();
        expect(text?.values[1]).toBeLessThan(82);
    });

    it("renders a route only when both endpoint labels are retained", () => {
        const base = spaciousWorld();
        const geographicWorld = new GeographicWorld({
            width: base.width,
            height: base.height,
            heightField: base.heightField,
            locations: base.getLocations(),
            connections: [connection("R", "A", "B")],
        });
        const surface = new RecordingSurface();

        new CanvasRenderer(theme(), (id) => ({
            text: id,
            priority: 1,
            minZoom: id === "A" ? 0 : 20,
        })).render(geographicWorld, spaciousCamera(), surface);

        expect(surface.commands.filter(({ kind }) => kind === "fillCircle")).toHaveLength(1);
        expect(surface.commands.filter(({ kind }) => kind === "strokeLine")).toHaveLength(0);
        expect(surface.commands.filter(({ kind }) => kind === "fillText")).toHaveLength(1);
    });

    it("reveals a location and its route together after crossing its zoom threshold", () => {
        const base = spaciousWorld();
        const geographicWorld = new GeographicWorld({
            width: base.width,
            height: base.height,
            heightField: base.heightField,
            locations: base.getLocations(),
            connections: [connection("R", "A", "B")],
        });
        const provider = (id: string) => ({
            text: id,
            priority: 1,
            minZoom: id === "A" ? 0 : 12,
        });
        const before = new RecordingSurface();
        const after = new RecordingSurface();
        const lowZoom = spaciousCamera();
        const highZoom = spaciousCamera();
        highZoom.setZoom(16);

        new CanvasRenderer(theme(), provider).render(geographicWorld, lowZoom, before);
        new CanvasRenderer(theme(), provider).render(geographicWorld, highZoom, after);

        expect(before.commands.filter(({ kind }) => kind === "fillCircle")).toHaveLength(1);
        expect(before.commands.filter(({ kind }) => kind === "strokeLine")).toHaveLength(0);
        expect(after.commands.filter(({ kind }) => kind === "fillCircle")).toHaveLength(2);
        expect(after.commands.filter(({ kind }) => kind === "strokeLine")).toHaveLength(1);
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
