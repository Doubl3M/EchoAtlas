const supportedMusicGeographicAppearanceVersions = ["music-geographic-appearance-v1"] as const;

/** Version of the application policy translating Music Activity into geographic appearance. */
export type MusicGeographicAppearanceVersion =
    (typeof supportedMusicGeographicAppearanceVersions)[number];

export function validateMusicGeographicAppearanceVersion(
    value: MusicGeographicAppearanceVersion
): void {
    if (!supportedMusicGeographicAppearanceVersions.some((version) => version === value)) {
        throw new RangeError(`Unsupported Music geographic appearance version: ${String(value)}`);
    }
}
