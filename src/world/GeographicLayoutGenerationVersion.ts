const supportedGeographicLayoutGenerationVersions = ["geographic-layout-v1"] as const;

/** Version of the deterministic GeographicHierarchy to GeographicLayout policy. */
export type GeographicLayoutGenerationVersion =
    (typeof supportedGeographicLayoutGenerationVersions)[number];

export function isSupportedGeographicLayoutGenerationVersion(
    value: unknown
): value is GeographicLayoutGenerationVersion {
    return supportedGeographicLayoutGenerationVersions.some((version) => version === value);
}
