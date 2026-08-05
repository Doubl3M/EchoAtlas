import { bootstrap } from "./app";

const root = document.querySelector<HTMLElement>("#app");

if (root === null) {
    throw new Error("Application root element was not found.");
}

await bootstrap();

const title = document.createElement("h1");
title.textContent = "EchoAtlas";

const foundation = document.createElement("p");
foundation.textContent = "Engine Foundation";

const status = document.createElement("p");
status.textContent = "initialized";

root.replaceChildren(title, foundation, status);
