function assertFinite(values: readonly number[]): void {
    if (values.some((value) => !Number.isFinite(value))) {
        throw new RangeError("Interpolation values must be finite.");
    }
}

export function clamp(value: number, boundA: number, boundB: number): number {
    assertFinite([value, boundA, boundB]);
    const minimum = Math.min(boundA, boundB);
    const maximum = Math.max(boundA, boundB);
    return Math.min(Math.max(value, minimum), maximum);
}

export function lerp(start: number, end: number, amount: number): number {
    assertFinite([start, end, amount]);
    return start + (end - start) * amount;
}

export function inverseLerp(start: number, end: number, value: number): number {
    assertFinite([start, end, value]);
    return start === end ? 0 : (value - start) / (end - start);
}

export function smoothstep(edgeStart: number, edgeEnd: number, value: number): number {
    const amount = normalizedStepAmount(edgeStart, edgeEnd, value);
    return amount * amount * (3 - 2 * amount);
}

export function smootherstep(edgeStart: number, edgeEnd: number, value: number): number {
    const amount = normalizedStepAmount(edgeStart, edgeEnd, value);
    return amount * amount * amount * (amount * (amount * 6 - 15) + 10);
}

function normalizedStepAmount(edgeStart: number, edgeEnd: number, value: number): number {
    assertFinite([edgeStart, edgeEnd, value]);

    if (edgeStart === edgeEnd) {
        return value < edgeStart ? 0 : 1;
    }

    return clamp(inverseLerp(edgeStart, edgeEnd, value), 0, 1);
}
