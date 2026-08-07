import { MusicCatalog } from "../MusicCatalog";
import { MusicEntity } from "../MusicEntity";
import type { MusicEntityKind } from "../MusicEntity";
import { MusicRelation } from "../MusicRelation";
import { ImportedMusicDocument } from "./ImportedMusicDocument";
import type { ImportedMusicMetadata } from "./ImportedMusicDocument";
import { MusicJsonImportError } from "./MusicJsonImportError";

type JsonObject = Record<string, unknown>;
type JsonV1EntityKind = "artist" | "album" | "track" | "label" | "playlist";

interface ImportedEndpoint {
    readonly kind: JsonV1EntityKind;
    readonly id: string;
}

const rootFields = [
    "metadata",
    "artists",
    "albums",
    "tracks",
    "labels",
    "playlists",
    "relations",
] as const;

const endpointKinds: readonly JsonV1EntityKind[] = [
    "artist",
    "album",
    "track",
    "label",
    "playlist",
];

/** Strict, deterministic boundary from external JSON values to the Music domain. */
export class MusicJsonImporter {
    public parse(json: string): ImportedMusicDocument {
        if (typeof json !== "string") {
            throw new MusicJsonImportError("validation", "$", "expected JSON text");
        }

        let value: unknown;
        try {
            value = JSON.parse(json) as unknown;
        } catch (error: unknown) {
            if (error instanceof SyntaxError) {
                throw new MusicJsonImportError("syntax", "$", "invalid JSON syntax");
            }
            throw error;
        }

        return this.import(value);
    }

    public import(value: unknown): ImportedMusicDocument {
        const root = expectObject(value, "$", "document object");
        validateFields(root, rootFields, [], "$");

        const metadata = importMetadata(root.metadata);
        const entities = [
            ...importArtists(root.artists),
            ...importAlbums(root.albums),
            ...importTracks(root.tracks),
            ...importNamedEntities(root.labels, "labels", "label"),
            ...importNamedEntities(root.playlists, "playlists", "playlist"),
        ];
        const entityIdentities = new Set(
            entities.map((entity) => entityIdentity(entity.kind, entity.id))
        );
        const relations = importRelations(root.relations, entityIdentities);

        return new ImportedMusicDocument(metadata, new MusicCatalog(entities, relations));
    }
}

function importMetadata(value: unknown): ImportedMusicMetadata {
    const path = "$.metadata";
    const object = expectObject(value, path, "metadata object");
    validateFields(object, ["version"], ["title", "owner", "generatedAt", "seed", "locale"], path);
    if (object.version !== "1.0") {
        fail(`${path}.version`, 'expected the supported version "1.0"');
    }

    const title = optionalText(object.title, `${path}.title`);
    const owner = optionalText(object.owner, `${path}.owner`);
    const generatedAt = optionalText(object.generatedAt, `${path}.generatedAt`);
    if (generatedAt !== undefined && !isRfc3339(generatedAt)) {
        fail(`${path}.generatedAt`, "expected an RFC 3339 date-time");
    }
    const seed = optionalSafeInteger(object.seed, `${path}.seed`);
    const locale = optionalText(object.locale, `${path}.locale`);

    return { version: "1.0", title, owner, generatedAt, seed, locale };
}

function importArtists(value: unknown): readonly MusicEntity[] {
    const values = expectArray(value, "$.artists");
    const entities = values.map((entry, index) => {
        const path = `$.artists[${index}]`;
        const object = expectObject(entry, path, "artist object");
        validateFields(object, ["id", "name"], ["country", "formed", "tags"], path);
        return new MusicEntity({
            kind: "artist",
            id: expectText(object.id, `${path}.id`),
            name: expectText(object.name, `${path}.name`),
            country: optionalText(object.country, `${path}.country`),
            formed: optionalSafeInteger(object.formed, `${path}.formed`),
            tags: optionalTags(object.tags, `${path}.tags`),
        });
    });
    ensureUniqueEntityIds(entities, "$.artists");
    return entities;
}

function importAlbums(value: unknown): readonly MusicEntity[] {
    const values = expectArray(value, "$.albums");
    const entities = values.map((entry, index) => {
        const path = `$.albums[${index}]`;
        const object = expectObject(entry, path, "album object");
        validateFields(object, ["id", "title"], ["year", "duration"], path);
        return new MusicEntity({
            kind: "album",
            id: expectText(object.id, `${path}.id`),
            title: expectText(object.title, `${path}.title`),
            year: optionalSafeInteger(object.year, `${path}.year`),
            duration: optionalDuration(object.duration, `${path}.duration`),
        });
    });
    ensureUniqueEntityIds(entities, "$.albums");
    return entities;
}

function importTracks(value: unknown): readonly MusicEntity[] {
    const values = expectArray(value, "$.tracks");
    const entities = values.map((entry, index) => {
        const path = `$.tracks[${index}]`;
        const object = expectObject(entry, path, "track object");
        validateFields(object, ["id", "title"], ["duration", "trackNumber"], path);
        return new MusicEntity({
            kind: "track",
            id: expectText(object.id, `${path}.id`),
            title: expectText(object.title, `${path}.title`),
            duration: optionalDuration(object.duration, `${path}.duration`),
            trackNumber: optionalPositiveInteger(object.trackNumber, `${path}.trackNumber`),
        });
    });
    ensureUniqueEntityIds(entities, "$.tracks");
    return entities;
}

function importNamedEntities(
    value: unknown,
    collection: "labels" | "playlists",
    kind: "label" | "playlist"
): readonly MusicEntity[] {
    const collectionPath = `$.${collection}`;
    const values = expectArray(value, collectionPath);
    const entities = values.map((entry, index) => {
        const path = `${collectionPath}[${index}]`;
        const object = expectObject(entry, path, `${kind} object`);
        validateFields(object, ["id", "name"], [], path);
        return new MusicEntity({
            kind,
            id: expectText(object.id, `${path}.id`),
            name: expectText(object.name, `${path}.name`),
        });
    });
    ensureUniqueEntityIds(entities, collectionPath);
    return entities;
}

function importRelations(
    value: unknown,
    entityIdentities: ReadonlySet<string>
): readonly MusicRelation[] {
    const values = expectArray(value, "$.relations");
    const relationIds = new Set<string>();
    return values.map((entry, index) => {
        const path = `$.relations[${index}]`;
        const object = expectObject(entry, path, "relation object");
        validateFields(object, ["id", "kind", "source", "target"], ["weight"], path);
        const id = expectText(object.id, `${path}.id`);
        if (relationIds.has(id)) {
            fail(`${path}.id`, `duplicate relation ID: ${id}`);
        }
        relationIds.add(id);

        const source = importEndpoint(object.source, `${path}.source`, entityIdentities);
        const target = importEndpoint(object.target, `${path}.target`, entityIdentities);
        return new MusicRelation({
            id,
            kind: expectText(object.kind, `${path}.kind`),
            sourceKind: source.kind,
            sourceId: source.id,
            targetKind: target.kind,
            targetId: target.id,
            weight: optionalFiniteNumber(object.weight, `${path}.weight`),
        });
    });
}

function importEndpoint(
    value: unknown,
    path: string,
    entityIdentities: ReadonlySet<string>
): ImportedEndpoint {
    const object = expectObject(value, path, "relation endpoint object");
    validateFields(object, ["kind", "id"], [], path);
    const kind = expectEndpointKind(object.kind, `${path}.kind`);
    const id = expectText(object.id, `${path}.id`);
    if (!entityIdentities.has(entityIdentity(kind, id))) {
        fail(`${path}.id`, `unknown ${kind} entity reference: ${id}`);
    }
    return { kind, id };
}

function validateFields(
    object: JsonObject,
    required: readonly string[],
    optional: readonly string[],
    path: string
): void {
    for (const field of required) {
        if (!Object.hasOwn(object, field)) {
            fail(`${path}.${field}`, "missing required field");
        }
    }
    const allowed = new Set([...required, ...optional]);
    const unknown = Object.keys(object)
        .filter((field) => !allowed.has(field))
        .sort(compareText);
    if (unknown[0] !== undefined) {
        fail(`${path}.${unknown[0]}`, "unknown field");
    }
    for (const field of Object.keys(object).sort(compareText)) {
        if (object[field] === undefined) {
            fail(`${path}.${field}`, "undefined is not a JSON value");
        }
    }
}

function ensureUniqueEntityIds(entities: readonly MusicEntity[], collectionPath: string): void {
    const ids = new Set<string>();
    entities.forEach((entity, index) => {
        if (ids.has(entity.id)) {
            fail(`${collectionPath}[${index}].id`, `duplicate ${entity.kind} ID: ${entity.id}`);
        }
        ids.add(entity.id);
    });
}

function expectObject(value: unknown, path: string, expected: string): JsonObject {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        fail(path, `expected ${expected}`);
    }
    return value as JsonObject;
}

function expectArray(value: unknown, path: string): readonly unknown[] {
    if (!Array.isArray(value)) {
        fail(path, "expected array");
    }
    for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
            fail(`${path}[${index}]`, "missing array value");
        }
    }
    return value;
}

function expectText(value: unknown, path: string): string {
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
        fail(path, "expected non-empty string without surrounding whitespace");
    }
    return value;
}

function optionalText(value: unknown, path: string): string | undefined {
    return value === undefined ? undefined : expectText(value, path);
}

function optionalSafeInteger(value: unknown, path: string): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
        fail(path, "expected safe integer");
    }
    return value;
}

function optionalDuration(value: unknown, path: string): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        fail(path, "expected finite non-negative number");
    }
    return value;
}

function optionalPositiveInteger(value: unknown, path: string): number | undefined {
    const integer = optionalSafeInteger(value, path);
    if (integer !== undefined && integer <= 0) {
        fail(path, "expected positive safe integer");
    }
    return integer;
}

function optionalFiniteNumber(value: unknown, path: string): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
        fail(path, "expected finite number");
    }
    return value;
}

function optionalTags(value: unknown, path: string): readonly string[] | undefined {
    if (value === undefined) {
        return undefined;
    }
    const values = expectArray(value, path);
    return values.map((tag, index) => expectText(tag, `${path}[${index}]`));
}

function expectEndpointKind(value: unknown, path: string): JsonV1EntityKind {
    if (typeof value !== "string" || !endpointKinds.includes(value as JsonV1EntityKind)) {
        fail(path, "expected a JSON V1 entity kind");
    }
    return value as JsonV1EntityKind;
}

function entityIdentity(kind: MusicEntityKind, id: string): string {
    return `${kind}:${id}`;
}

function isRfc3339(value: string): boolean {
    const match =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(
            value
        );
    if (match === null) {
        return false;
    }
    const [, yearText, monthText, dayText, hourText, minuteText, secondText, zoneHour, zoneMinute] =
        match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const daysInMonth = month >= 1 && month <= 12 ? monthLength(year, month) : 0;
    return (
        year >= 1 &&
        day >= 1 &&
        day <= daysInMonth &&
        Number(hourText) <= 23 &&
        Number(minuteText) <= 59 &&
        Number(secondText) <= 59 &&
        (zoneHour === undefined || Number(zoneHour) <= 23) &&
        (zoneMinute === undefined || Number(zoneMinute) <= 59)
    );
}

function monthLength(year: number, month: number): number {
    if (month === 2) {
        const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        return leap ? 29 : 28;
    }
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function fail(path: string, reason: string): never {
    throw new MusicJsonImportError("validation", path, reason);
}
