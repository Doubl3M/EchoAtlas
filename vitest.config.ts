import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        exclude: [...configDefaults.exclude, "tests/e2e/**", "benchmarks/**"],
        environment: "node",
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
        },
    },
});
