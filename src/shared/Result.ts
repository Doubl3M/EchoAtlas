export interface Success<T> {
    readonly ok: true;
    readonly value: T;
}

export interface Failure<E> {
    readonly error: E;
    readonly ok: false;
}

export type Result<T, E> = Success<T> | Failure<E>;

export function success<T>(value: T): Success<T> {
    return { ok: true, value };
}

export function failure<E>(error: E): Failure<E> {
    return { error, ok: false };
}
