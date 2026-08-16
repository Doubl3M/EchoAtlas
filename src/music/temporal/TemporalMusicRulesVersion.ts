const supportedTemporalMusicRulesVersions = ["temporal-music-presence-v1"] as const;

/** Version of the Music-domain rules that determine which identities exist at T. */
export type TemporalMusicRulesVersion = (typeof supportedTemporalMusicRulesVersions)[number];

export function validateTemporalMusicRulesVersion(value: TemporalMusicRulesVersion): void {
    if (!supportedTemporalMusicRulesVersions.some((version) => version === value)) {
        throw new RangeError(`Unsupported temporal Music rules version: ${String(value)}`);
    }
}
