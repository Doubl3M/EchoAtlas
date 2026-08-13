export function validateGeographicIdentifier(value: string, name: string): void {
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
        throw new TypeError(`${name} must be non-empty and have no surrounding whitespace.`);
    }
}
