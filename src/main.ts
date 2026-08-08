import { bootstrap, mountNavigableMap } from "./app";

const root = document.querySelector<HTMLElement>("#app");
if (root === null) {
    throw new Error("Application root element was not found.");
}

await bootstrap();
mountNavigableMap(root);
