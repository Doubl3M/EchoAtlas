import { defineConfig } from "vite";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: "index.html",
                semanticPreview: "semantic-preview.html",
                stableDemo: "demo.html",
            },
        },
    },
});
