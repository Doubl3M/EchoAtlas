const supportedGeographicRegionFieldGenerationVersions = ["geographic-region-field-v1"] as const;

/** Version of the GeographicLayout to sampled territorial ownership policy. */
export type GeographicRegionFieldGenerationVersion =
    (typeof supportedGeographicRegionFieldGenerationVersions)[number];

export function isSupportedGeographicRegionFieldGenerationVersion(
    value: unknown
): value is GeographicRegionFieldGenerationVersion {
    return supportedGeographicRegionFieldGenerationVersions.some((version) => version === value);
}
