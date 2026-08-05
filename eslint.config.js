import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["coverage", "dist", "node_modules"],
    },
    js.configs.recommended,
    ...tseslint.configs.strict,
    {
        files: ["**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
        },
    }
);
