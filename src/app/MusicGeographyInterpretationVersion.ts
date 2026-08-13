export const musicGeographyInterpretationVersions = ["music-geography-v1"] as const;

/** Version of the Music-specific rules that derive semantic geography. */
export type MusicGeographyInterpretationVersion =
    (typeof musicGeographyInterpretationVersions)[number];

export function validateMusicGeographyInterpretationVersion(
    version: MusicGeographyInterpretationVersion
): void {
    if (!musicGeographyInterpretationVersions.includes(version)) {
        throw new TypeError(
            `Unsupported Music geography interpretation version: ${String(version)}`
        );
    }
}
