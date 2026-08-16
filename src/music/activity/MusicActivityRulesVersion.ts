const supportedMusicActivityRulesVersions = ["music-activity-v1"] as const;

/** Version of the Music-domain rules that measure and classify activity at T. */
export type MusicActivityRulesVersion = (typeof supportedMusicActivityRulesVersions)[number];

export function validateMusicActivityRulesVersion(value: MusicActivityRulesVersion): void {
    if (!supportedMusicActivityRulesVersions.some((version) => version === value)) {
        throw new RangeError(`Unsupported Music activity rules version: ${String(value)}`);
    }
}
