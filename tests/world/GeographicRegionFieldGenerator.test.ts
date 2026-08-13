import { describe, expect, it } from "vitest";

import {
    GeographicContent,
    GeographicFeature,
    GeographicHierarchy,
    GeographicLayout,
    GeographicLayoutGenerator,
    GeographicLayoutGeneratorConfig,
    GeographicRegionField,
    GeographicRegionFieldGenerator,
    GeographicRegionFieldGeneratorConfig,
    type GeographicFeatureId,
    type GeographicRegionFieldGenerationVersion,
    type GeographicRole,
} from "../../src/world";

describe("GeographicRegionFieldGenerator", () => {
    it("generates an empty Field from an empty hierarchy and layout", () => {
        const hierarchy = new GeographicHierarchy();
        const field = fieldGenerator().generate(hierarchy, layoutGenerator().generate(hierarchy));
        expect(field).toBeInstanceOf(GeographicRegionField);
        expect(ownerSignature(field)).toEqual(new Array(32 * 16).fill(undefined));
    });

    it.each([0, -1, 1.5, Number.NaN])("rejects invalid raster resolution %s", (resolution) => {
        expect(
            () =>
                new GeographicRegionFieldGeneratorConfig({
                    generationVersion: "geographic-region-field-v1",
                    seed: 1,
                    columns: resolution,
                    rows: 10,
                })
        ).toThrow("columns must be a positive safe integer");
        expect(
            () =>
                new GeographicRegionFieldGeneratorConfig({
                    generationVersion: "geographic-region-field-v1",
                    seed: 1,
                    columns: 10,
                    rows: resolution,
                })
        ).toThrow("rows must be a positive safe integer");
    });

    it("rejects an unknown generation version", () => {
        expect(
            () =>
                new GeographicRegionFieldGeneratorConfig({
                    generationVersion:
                        "geographic-region-field-v2" as GeographicRegionFieldGenerationVersion,
                    seed: 1,
                    columns: 10,
                    rows: 10,
                })
        ).toThrow("Unsupported geographic region field generation version");
    });

    it("gives one root Region owned cells and a non-rectangular free margin", () => {
        const hierarchy = hierarchyOf([feature("root", "continent")]);
        const layout = layoutGenerator().generate(hierarchy);
        const field = fieldGenerator({ columns: 80, rows: 40 }).generate(hierarchy, layout);
        const owners = ownerSignature(field);
        expect(owners).toContain("root");
        expect(owners).toContain(undefined);
        expect(owners.filter((owner) => owner === "root").length).toBeGreaterThan(100);
    });

    it("keeps a normally sampled root territory connected while producing a concavity", () => {
        const hierarchy = hierarchyOf([feature("root", "continent")]);
        const field = generateField(hierarchy, {
            seed: "connected-concave-root",
            columns: 192,
            rows: 128,
        });
        expect(countComponents(field, (owner) => owner === "root")).toBe(1);
        expect(hasAxisVisibleConcavity(field, "root")).toBe(true);
    });

    it("never assigns a root outside its structural bounds", () => {
        const root = feature("root", "continent");
        const hierarchy = hierarchyOf([root]);
        const layout = new GeographicLayout({
            hierarchy,
            width: 100,
            height: 50,
            placements: [
                {
                    kind: "region",
                    featureId: root.id,
                    bounds: { x0: 20, y0: 10, x1: 80, y1: 40 },
                    anchor: { x: 50, y: 25 },
                },
            ],
        });
        const field = fieldGenerator({ columns: 50, rows: 25 }).generate(hierarchy, layout);
        forEachOwnedCell(field, layout, (owner, x, y) => {
            if (owner === root.id) {
                expect(x).toBeGreaterThanOrEqual(20);
                expect(x).toBeLessThanOrEqual(80);
                expect(y).toBeGreaterThanOrEqual(10);
                expect(y).toBeLessThanOrEqual(40);
            }
        });
    });

    it("produces distinct territories and free cells for multiple roots", () => {
        const hierarchy = hierarchyOf([
            feature("root:a", "continent"),
            feature("root:b", "continent"),
            feature("root:c", "continent"),
        ]);
        const field = generateField(hierarchy, { columns: 90, rows: 45 });
        const owners = new Set(ownerSignature(field));
        expect(owners).toEqual(new Set([undefined, "root:a", "root:b", "root:c"]));
    });

    it("stores only the deepest Region owner through arbitrary depth", () => {
        const hierarchy = hierarchyOf([
            feature("root", "continent"),
            feature("level-one", "district", "root"),
            feature("level-two", "district", "level-one"),
            feature("site", "building", "level-two"),
        ]);
        const field = generateField(hierarchy, { columns: 60, rows: 30 });
        const owned = ownerSignature(field).filter((owner) => owner !== undefined);
        expect(new Set(owned)).toEqual(new Set(["level-two"]));
        expect(owned).not.toContain("site");
    });

    it("keeps child ownership inside the territory of its root ancestry", () => {
        const hierarchy = branchingHierarchy();
        const field = generateField(hierarchy, { columns: 80, rows: 40 });
        const rootsByOwner = rootIdsByFeature(hierarchy);
        for (const owner of ownerSignature(field)) {
            if (owner !== undefined) expect(rootsByOwner.get(owner)).toMatch(/^root:/);
        }
        expect(new Set(ownerSignature(field))).toEqual(new Set([undefined, "child:a", "child:b"]));
    });

    it("never creates double ownership and Site features never own cells", () => {
        const hierarchy = branchingHierarchy();
        const field = generateField(hierarchy);
        expect(ownerSignature(field)).not.toContain("site:a");
        expect(ownerSignature(field)).not.toContain("site:b");
        expect(ownerSignature(field)).toHaveLength(field.getColumnCount() * field.getRowCount());
    });

    it("is independent from GeographicContent", () => {
        const features = [
            feature("root", "continent"),
            feature("child", "district", "root"),
            feature("site", "building", "child"),
        ];
        const withoutContents = hierarchyOf(features);
        const withContents = new GeographicHierarchy({
            features,
            contents: Array.from(
                { length: 30 },
                (_, index) =>
                    new GeographicContent({
                        id: `content:${index}`,
                        knowledgeNodeId: `knowledge:${index}`,
                        containerFeatureId: "site",
                    })
            ),
        });
        const firstLayout = layoutGenerator().generate(withoutContents);
        const secondLayout = layoutGenerator().generate(withContents);
        expect(ownerSignature(fieldGenerator().generate(withContents, secondLayout))).toEqual(
            ownerSignature(fieldGenerator().generate(withoutContents, firstLayout))
        );
    });

    it("is exactly deterministic across hierarchy permutations", () => {
        const hierarchy = branchingHierarchy();
        const reversed = new GeographicHierarchy({
            features: [...hierarchy.getFeatures()].reverse(),
        });
        expect(ownerSignature(generateField(reversed))).toEqual(
            ownerSignature(generateField(hierarchy))
        );
    });

    it("is exactly reproducible for the same seed and changes with another seed", () => {
        const hierarchy = branchingHierarchy();
        expect(ownerSignature(generateField(hierarchy, { seed: "same" }))).toEqual(
            ownerSignature(generateField(hierarchy, { seed: "same" }))
        );
        expect(ownerSignature(generateField(hierarchy, { seed: "first" }))).not.toEqual(
            ownerSignature(generateField(hierarchy, { seed: "second" }))
        );
    });

    it("warps internal borders away from the rectangular source partition", () => {
        const hierarchy = hierarchyOf([
            feature("root", "continent"),
            feature("left", "district", "root"),
            feature("right", "district", "root"),
        ]);
        const layout = layoutGenerator().generate(hierarchy);
        const field = fieldGenerator({ columns: 120, rows: 60 }).generate(hierarchy, layout);
        let differsFromBounds = false;
        forEachOwnedCell(field, layout, (owner, x, y) => {
            if (owner === undefined) return;
            const rectangularOwner = ["left", "right"].find((id) => {
                const bounds = layout.getRegionPlacementByFeatureId(id)?.bounds;
                return bounds !== undefined && contains(bounds, x, y);
            });
            if (rectangularOwner !== owner) differsFromBounds = true;
        });
        expect(differsFromBounds).toBe(true);
    });

    it("keeps child territories coherent on a representative hierarchical fixture", () => {
        const hierarchy = hierarchyOf([
            feature("root", "continent"),
            feature("first", "district", "root"),
            feature("second", "district", "root"),
            feature("third", "district", "root"),
        ]);
        const field = generateField(hierarchy, { columns: 192, rows: 128 });
        for (const owner of ["first", "second", "third"]) {
            expect(countComponents(field, (candidate) => candidate === owner)).toBe(1);
        }
    });

    it("samples World coordinates and maps the inclusive maximum to the last cell", () => {
        const hierarchy = hierarchyOf([feature("root", "continent")]);
        const field = generateField(hierarchy, { columns: 20, rows: 10 });
        expect(field.getOwnerFeatureIdAtWorldPosition(120, 60)).toBe(
            field.getOwnerFeatureId(19, 9)
        );
    });

    it("allows a structurally valid tiny Region to disappear at low raster resolution", () => {
        const root = feature("root", "continent");
        const tiny = feature("tiny", "district", root.id);
        const hierarchy = hierarchyOf([root, tiny]);
        const layout = new GeographicLayout({
            hierarchy,
            width: 100,
            height: 50,
            placements: [
                {
                    kind: "region",
                    featureId: root.id,
                    bounds: { x0: 0, y0: 0, x1: 100, y1: 50 },
                    anchor: { x: 50, y: 25 },
                },
                {
                    kind: "region",
                    featureId: tiny.id,
                    bounds: { x0: 0, y0: 0, x1: 0.01, y1: 0.01 },
                    anchor: { x: 0.005, y: 0.005 },
                },
            ],
        });
        expect(() =>
            fieldGenerator({ columns: 1, rows: 1 }).generate(hierarchy, layout)
        ).not.toThrow();
    });

    it("rejects a layout describing different feature identities", () => {
        const hierarchy = hierarchyOf([feature("expected", "continent")]);
        const other = hierarchyOf([feature("other", "continent")]);
        expect(() =>
            fieldGenerator().generate(hierarchy, layoutGenerator().generate(other))
        ).toThrow("hierarchy and layout must contain the same features");
    });
});

function feature(id: string, role: GeographicRole, parentId?: string): GeographicFeature {
    return new GeographicFeature({ id, role, parentId });
}

function hierarchyOf(features: readonly GeographicFeature[]): GeographicHierarchy {
    return new GeographicHierarchy({ features });
}

function branchingHierarchy(): GeographicHierarchy {
    return hierarchyOf([
        feature("root:a", "continent"),
        feature("child:a", "district", "root:a"),
        feature("site:a", "building", "child:a"),
        feature("root:b", "continent"),
        feature("child:b", "district", "root:b"),
        feature("site:b", "building", "child:b"),
    ]);
}

function layoutGenerator(): GeographicLayoutGenerator {
    return new GeographicLayoutGenerator(
        new GeographicLayoutGeneratorConfig({
            generationVersion: "geographic-layout-v1",
            seed: "layout",
            width: 120,
            height: 60,
        })
    );
}

function fieldGenerator(
    overrides: Partial<{ seed: string | number; columns: number; rows: number }> = {}
): GeographicRegionFieldGenerator {
    return new GeographicRegionFieldGenerator(
        new GeographicRegionFieldGeneratorConfig({
            generationVersion: "geographic-region-field-v1",
            seed: overrides.seed ?? "field",
            columns: overrides.columns ?? 32,
            rows: overrides.rows ?? 16,
        })
    );
}

function generateField(
    hierarchy: GeographicHierarchy,
    overrides: Partial<{ seed: string | number; columns: number; rows: number }> = {}
): GeographicRegionField {
    return fieldGenerator(overrides).generate(hierarchy, layoutGenerator().generate(hierarchy));
}

function ownerSignature(field: GeographicRegionField): readonly (string | undefined)[] {
    const owners: Array<string | undefined> = [];
    for (let row = 0; row < field.getRowCount(); row += 1) {
        for (let column = 0; column < field.getColumnCount(); column += 1) {
            owners.push(field.getOwnerFeatureId(column, row));
        }
    }
    return owners;
}

function forEachOwnedCell(
    field: GeographicRegionField,
    layout: GeographicLayout,
    visit: (owner: GeographicFeatureId | undefined, x: number, y: number) => void
): void {
    for (let row = 0; row < field.getRowCount(); row += 1) {
        for (let column = 0; column < field.getColumnCount(); column += 1) {
            visit(
                field.getOwnerFeatureId(column, row),
                ((column + 0.5) * layout.width) / field.getColumnCount(),
                ((row + 0.5) * layout.height) / field.getRowCount()
            );
        }
    }
}

function rootIdsByFeature(
    hierarchy: GeographicHierarchy
): ReadonlyMap<GeographicFeatureId, GeographicFeatureId> {
    const result = new Map<GeographicFeatureId, GeographicFeatureId>();
    for (const feature of hierarchy.getFeatures()) {
        let current = feature;
        while (hierarchy.getParent(current.id) !== undefined) {
            current = hierarchy.getParent(current.id) as GeographicFeature;
        }
        result.set(feature.id, current.id);
    }
    return result;
}

function contains(
    bounds: Readonly<{ x0: number; y0: number; x1: number; y1: number }>,
    x: number,
    y: number
): boolean {
    return x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1;
}

function countComponents(
    field: GeographicRegionField,
    belongs: (owner: string | undefined) => boolean
): number {
    const columns = field.getColumnCount();
    const rows = field.getRowCount();
    const visited = new Uint8Array(columns * rows);
    let components = 0;
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            const start = row * columns + column;
            if (visited[start] === 1 || !belongs(field.getOwnerFeatureId(column, row))) continue;
            components += 1;
            const queue = [start];
            visited[start] = 1;
            for (let cursor = 0; cursor < queue.length; cursor += 1) {
                const index = queue[cursor] as number;
                const x = index % columns;
                const y = Math.floor(index / columns);
                for (const neighbor of [index - 1, index + 1, index - columns, index + columns]) {
                    if (neighbor < 0 || neighbor >= visited.length || visited[neighbor] === 1) {
                        continue;
                    }
                    const neighborX = neighbor % columns;
                    const neighborY = Math.floor(neighbor / columns);
                    if (Math.abs(neighborX - x) + Math.abs(neighborY - y) !== 1) continue;
                    if (!belongs(field.getOwnerFeatureId(neighborX, neighborY))) continue;
                    visited[neighbor] = 1;
                    queue.push(neighbor);
                }
            }
        }
    }
    return components;
}

function hasAxisVisibleConcavity(field: GeographicRegionField, ownerId: string): boolean {
    for (let row = 0; row < field.getRowCount(); row += 1) {
        let first = -1;
        let last = -1;
        for (let column = 0; column < field.getColumnCount(); column += 1) {
            if (field.getOwnerFeatureId(column, row) !== ownerId) continue;
            if (first < 0) first = column;
            last = column;
        }
        if (first < 0) continue;
        for (let column = first + 1; column < last; column += 1) {
            if (field.getOwnerFeatureId(column, row) === undefined) return true;
        }
    }
    for (let column = 0; column < field.getColumnCount(); column += 1) {
        let first = -1;
        let last = -1;
        for (let row = 0; row < field.getRowCount(); row += 1) {
            if (field.getOwnerFeatureId(column, row) !== ownerId) continue;
            if (first < 0) first = row;
            last = row;
        }
        for (let row = first + 1; first >= 0 && row < last; row += 1) {
            if (field.getOwnerFeatureId(column, row) === undefined) return true;
        }
    }
    return false;
}
