const supportedWorldGenerationVersions = ["world-v1-exact"] as const;

/** Version of the observable geographic generation physics. */
export type WorldGenerationVersion = (typeof supportedWorldGenerationVersions)[number];

export function isSupportedWorldGenerationVersion(value: unknown): value is WorldGenerationVersion {
    return supportedWorldGenerationVersions.some((version) => version === value);
}
