import {
    GeographicFeature,
    GeographicHierarchy,
    GeographicLayoutGenerator,
    GeographicLayoutGeneratorConfig,
    GeographicRegionFieldGenerator,
    GeographicRegionFieldGeneratorConfig,
    type GeographicFeatureId,
    type GeographicHierarchy as GeographicHierarchyType,
    type GeographicLayout,
    type GeographicRegionField,
} from "../../src/world";

const WORLD = Object.freeze({ width: 1200, height: 800 });
const SEEDS = Object.freeze(["atlas-copper", "atlas-olive", "atlas-prune"]);
const RESOLUTIONS = Object.freeze([
    Object.freeze({ columns: 96, rows: 64 }),
    Object.freeze({ columns: 192, rows: 128 }),
    Object.freeze({ columns: 384, rows: 256 }),
]);

interface PreviewState {
    seed: string;
    resolution: (typeof RESOLUTIONS)[number];
    bounds: boolean;
    anchors: boolean;
    sites: boolean;
    labels: boolean;
}

interface SiteDiagnostic {
    readonly id: GeographicFeatureId;
    readonly status: "ok" | "mismatch" | "no-owner";
}

interface FragmentationDiagnostic {
    readonly rootComponents: string;
    readonly fragmentedTerritories: number;
    readonly extraFragments: number;
}

const hierarchy = createHierarchy();
const canvas = requireElement("field", HTMLCanvasElement);
const context = requireCanvasContext(canvas);

const state: PreviewState = {
    seed: SEEDS[0] as string,
    resolution: RESOLUTIONS[1] as (typeof RESOLUTIONS)[number],
    bounds: true,
    anchors: true,
    sites: true,
    labels: true,
};

initializeControls();
window.addEventListener("resize", render);
render();

function createHierarchy(): GeographicHierarchyType {
    const specs: readonly [string, "continent" | "district" | "building", string?][] = [
        ["A", "continent"],
        ["A1", "district", "A"],
        ["A2", "district", "A"],
        ["A1-s1", "building", "A1"],
        ["A1-s2", "building", "A1"],
        ["A2-s1", "building", "A2"],
        ["B", "continent"],
        ["B1", "district", "B"],
        ["B2", "district", "B"],
        ["B3", "district", "B"],
        ["B1-s1", "building", "B1"],
        ["B1-s2", "building", "B1"],
        ["B1-s3", "building", "B1"],
        ["B2-s1", "building", "B2"],
        ["B3-s1", "building", "B3"],
        ["B3-s2", "building", "B3"],
        ["C-empty", "continent"],
        ["D", "continent"],
        ["D1", "district", "D"],
        ["D1a", "district", "D1"],
        ["D1b", "district", "D1"],
        ["D1a-s1", "building", "D1a"],
        ["D1a-s2", "building", "D1a"],
        ["D1b-s1", "building", "D1b"],
    ];
    return new GeographicHierarchy({
        features: specs.map(
            ([id, role, parentId]) => new GeographicFeature({ id, role, parentId })
        ),
    });
}

function render(): void {
    const layout = new GeographicLayoutGenerator(
        new GeographicLayoutGeneratorConfig({
            generationVersion: "geographic-layout-v1",
            seed: state.seed,
            ...WORLD,
        })
    ).generate(hierarchy);
    const field = new GeographicRegionFieldGenerator(
        new GeographicRegionFieldGeneratorConfig({
            generationVersion: "geographic-region-field-v1",
            seed: state.seed,
            ...state.resolution,
        })
    ).generate(hierarchy, layout);

    resizeBackingStore();
    const scaleX = canvas.width / WORLD.width;
    const scaleY = canvas.height / WORLD.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawField(field, scaleX, scaleY);
    if (state.bounds) drawBounds(layout, scaleX, scaleY);
    if (state.anchors) drawAnchors(layout, scaleX, scaleY);
    const diagnostics = diagnoseSites(field, layout);
    const fragmentation = diagnoseFragmentation(field);
    if (state.sites) drawSites(layout, diagnostics, scaleX, scaleY);
    if (state.labels) drawLabels(layout, scaleX, scaleY);
    updateInformation(field, layout, diagnostics, fragmentation);
}

function drawField(field: GeographicRegionField, scaleX: number, scaleY: number): void {
    const cellWidth = canvas.width / field.getColumnCount();
    const cellHeight = canvas.height / field.getRowCount();
    for (let row = 0; row < field.getRowCount(); row += 1) {
        for (let column = 0; column < field.getColumnCount(); column += 1) {
            const ownerId = field.getOwnerFeatureId(column, row);
            context.fillStyle = ownerId === undefined ? "#f3eee3" : colorFor(ownerId);
            context.fillRect(
                column * cellWidth,
                row * cellHeight,
                cellWidth + 0.7,
                cellHeight + 0.7
            );
        }
    }
    context.strokeStyle = "#584d4138";
    context.strokeRect(0.5, 0.5, WORLD.width * scaleX - 1, WORLD.height * scaleY - 1);
}

function drawBounds(layout: GeographicLayout, scaleX: number, scaleY: number): void {
    context.save();
    context.setLineDash([5, 4]);
    context.lineWidth = 1;
    for (const placement of layout.getPlacements()) {
        if (placement.kind !== "region") continue;
        const depth = depthOf(placement.featureId);
        context.strokeStyle = depth === 0 ? "#211c18cc" : "#4d41379a";
        context.strokeRect(
            placement.bounds.x0 * scaleX + 0.5,
            placement.bounds.y0 * scaleY + 0.5,
            (placement.bounds.x1 - placement.bounds.x0) * scaleX - 1,
            (placement.bounds.y1 - placement.bounds.y0) * scaleY - 1
        );
    }
    context.restore();
}

function drawAnchors(layout: GeographicLayout, scaleX: number, scaleY: number): void {
    context.save();
    context.strokeStyle = "#211c18";
    context.lineWidth = 1.5;
    for (const placement of layout.getPlacements()) {
        if (placement.kind !== "region") continue;
        const x = placement.anchor.x * scaleX;
        const y = placement.anchor.y * scaleY;
        context.beginPath();
        context.moveTo(x - 4, y);
        context.lineTo(x + 4, y);
        context.moveTo(x, y - 4);
        context.lineTo(x, y + 4);
        context.stroke();
    }
    context.restore();
}

function drawSites(
    layout: GeographicLayout,
    diagnostics: readonly SiteDiagnostic[],
    scaleX: number,
    scaleY: number
): void {
    const statuses = new Map(diagnostics.map((diagnostic) => [diagnostic.id, diagnostic.status]));
    for (const placement of layout.getPlacements()) {
        if (placement.kind !== "site") continue;
        const status = statuses.get(placement.featureId) as SiteDiagnostic["status"];
        context.beginPath();
        context.arc(
            placement.position.x * scaleX,
            placement.position.y * scaleY,
            4.5,
            0,
            Math.PI * 2
        );
        context.fillStyle =
            status === "ok" ? "#efffd9" : status === "mismatch" ? "#efad35" : "#b23a48";
        context.fill();
        context.strokeStyle = "#312821";
        context.lineWidth = 1.5;
        context.stroke();
    }
}

function drawLabels(layout: GeographicLayout, scaleX: number, scaleY: number): void {
    context.save();
    context.font = "bold 11px ui-monospace, monospace";
    context.textBaseline = "bottom";
    context.fillStyle = "#28211c";
    for (const placement of layout.getPlacements()) {
        const point = placement.kind === "region" ? placement.anchor : placement.position;
        const depth = depthOf(placement.featureId);
        if (placement.kind === "site" || depth > 1) continue;
        context.fillText(placement.featureId, point.x * scaleX + 6, point.y * scaleY - 4);
    }
    context.restore();
}

function diagnoseSites(
    field: GeographicRegionField,
    layout: GeographicLayout
): readonly SiteDiagnostic[] {
    return layout.getPlacements().flatMap((placement) => {
        if (placement.kind !== "site") return [];
        const expectedId = hierarchy.getFeatureById(placement.featureId)?.parentId;
        const ownerId = field.getOwnerFeatureIdAtWorldPosition(
            placement.position.x,
            placement.position.y
        );
        let status: SiteDiagnostic["status"] = "mismatch";
        if (ownerId === undefined) status = "no-owner";
        else if (ownerId === expectedId) status = "ok";
        return [{ id: placement.featureId, status }];
    });
}

function updateInformation(
    field: GeographicRegionField,
    layout: GeographicLayout,
    diagnostics: readonly SiteDiagnostic[],
    fragmentation: FragmentationDiagnostic
): void {
    let noOwnerCount = 0;
    const owners = new Set<GeographicFeatureId>();
    for (let row = 0; row < field.getRowCount(); row += 1) {
        for (let column = 0; column < field.getColumnCount(); column += 1) {
            const owner = field.getOwnerFeatureId(column, row);
            if (owner === undefined) noOwnerCount += 1;
            else owners.add(owner);
        }
    }
    const cellCount = field.getColumnCount() * field.getRowCount();
    const values: readonly [string, string][] = [
        ["Seed", state.seed],
        ["Resolution", `${field.getColumnCount()} × ${field.getRowCount()}`],
        ["World", `${layout.width} × ${layout.height}`],
        ["Regions", String(layout.getPlacements().filter(({ kind }) => kind === "region").length)],
        ["Sites", String(diagnostics.length)],
        ["No owner", `${((noOwnerCount / cellCount) * 100).toFixed(2)}%`],
        ["Sites OK", String(diagnostics.filter(({ status }) => status === "ok").length)],
        [
            "Boundary mismatch",
            String(diagnostics.filter(({ status }) => status === "mismatch").length),
        ],
        [
            "Sites no-owner",
            String(diagnostics.filter(({ status }) => status === "no-owner").length),
        ],
        ["Root components", fragmentation.rootComponents],
        ["Fragmented territories", String(fragmentation.fragmentedTerritories)],
        ["Extra fragments", String(fragmentation.extraFragments)],
    ];
    requireElement("metrics", HTMLDListElement).replaceChildren(
        ...values.flatMap(([label, value]) => [element("dt", label), element("dd", value)])
    );
    const roots = hierarchy.getFeatures().filter(({ parentId }) => parentId === undefined);
    requireElement("legend", HTMLDivElement).replaceChildren(
        ...roots.map((root) => {
            const item = element(
                "span",
                `${root.id} · ${countOwnedFamily(owners, root.id)} owners`
            );
            const swatch = document.createElement("i");
            swatch.style.background = colorFor(root.id);
            item.prepend(swatch);
            return item;
        })
    );
}

function diagnoseFragmentation(field: GeographicRegionField): FragmentationDiagnostic {
    const ownerAt = (column: number, row: number): GeographicFeatureId | undefined =>
        field.getOwnerFeatureId(column, row);
    const roots = hierarchy.getFeatures().filter(({ parentId }) => parentId === undefined);
    const rootComponents = roots.map((root) => {
        const count = countComponents(
            field,
            (owner) => owner !== undefined && rootOf(owner) === root.id
        );
        return `${root.id}:${count}`;
    });
    const owners = new Set<GeographicFeatureId>();
    for (let row = 0; row < field.getRowCount(); row += 1) {
        for (let column = 0; column < field.getColumnCount(); column += 1) {
            const owner = ownerAt(column, row);
            if (owner !== undefined) owners.add(owner);
        }
    }
    const childComponents = [...owners]
        .filter((owner) => hierarchy.getFeatureById(owner)?.parentId !== undefined)
        .map((owner) => countComponents(field, (candidate) => candidate === owner));
    return {
        rootComponents: rootComponents.join(" · "),
        fragmentedTerritories: childComponents.filter((count) => count > 1).length,
        extraFragments: childComponents.reduce((total, count) => total + Math.max(0, count - 1), 0),
    };
}

function countComponents(
    field: GeographicRegionField,
    belongs: (owner: GeographicFeatureId | undefined) => boolean
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
                    if (neighbor < 0 || neighbor >= visited.length || visited[neighbor] === 1)
                        continue;
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

function colorFor(featureId: GeographicFeatureId): string {
    const rootId = rootOf(featureId);
    const rootHash = hashText(rootId);
    const featureHash = hashText(featureId);
    const hue = rootHash % 360;
    const depth = depthOf(featureId);
    const saturation = 45 + (featureHash % 16);
    const lightness = 48 + ((featureHash >>> 5) % 17) + depth * 3;
    return `hsl(${hue} ${saturation}% ${Math.min(lightness, 76)}%)`;
}

function rootOf(featureId: GeographicFeatureId): GeographicFeatureId {
    let current = hierarchy.getFeatureById(featureId);
    if (current === undefined) throw new Error(`Unknown feature: ${featureId}`);
    while (current.parentId !== undefined) {
        current = hierarchy.getFeatureById(current.parentId) as GeographicFeature;
    }
    return current.id;
}

function depthOf(featureId: GeographicFeatureId): number {
    let depth = 0;
    let current = hierarchy.getFeatureById(featureId);
    while (current?.parentId !== undefined) {
        depth += 1;
        current = hierarchy.getFeatureById(current.parentId);
    }
    return depth;
}

function countOwnedFamily(owners: ReadonlySet<GeographicFeatureId>, rootId: string): number {
    return [...owners].filter((owner) => rootOf(owner) === rootId).length;
}

function hashText(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash = Math.imul(hash ^ value.charCodeAt(index), 16777619) >>> 0;
    }
    return hash;
}

function resizeBackingStore(): void {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
}

function initializeControls(): void {
    const seedSelect = requireElement("seed", HTMLSelectElement);
    seedSelect.replaceChildren(...SEEDS.map((seed) => option(seed, seed)));
    seedSelect.value = state.seed;
    seedSelect.addEventListener("change", () => {
        state.seed = seedSelect.value;
        render();
    });

    const resolutionSelect = requireElement("resolution", HTMLSelectElement);
    resolutionSelect.replaceChildren(
        ...RESOLUTIONS.map(({ columns, rows }, index) =>
            option(String(index), `${columns} × ${rows}`)
        )
    );
    resolutionSelect.value = "1";
    resolutionSelect.addEventListener("change", () => {
        state.resolution = RESOLUTIONS[
            Number(resolutionSelect.value)
        ] as (typeof RESOLUTIONS)[number];
        render();
    });

    for (const key of ["bounds", "anchors", "sites", "labels"] as const) {
        const input = requireElement(key, HTMLInputElement);
        input.addEventListener("change", () => {
            state[key] = input.checked;
            render();
        });
    }
}

function option(value: string, text: string): HTMLOptionElement {
    const result = document.createElement("option");
    result.value = value;
    result.textContent = text;
    return result;
}

function element<Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    text: string
): HTMLElementTagNameMap[Tag] {
    const result = document.createElement(tag);
    result.textContent = text;
    return result;
}

function requireElement<T extends Element>(id: string, constructor: { new (): T }): T {
    const result = document.getElementById(id);
    if (!(result instanceof constructor)) throw new Error(`Missing preview element: ${id}`);
    return result;
}

function requireCanvasContext(canvasElement: HTMLCanvasElement): CanvasRenderingContext2D {
    const result = canvasElement.getContext("2d");
    if (result === null) throw new Error("Canvas 2D is required by the diagnostic preview.");
    return result;
}
