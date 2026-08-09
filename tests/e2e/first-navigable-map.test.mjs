import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import process from "node:process";
import test from "node:test";

import puppeteer from "puppeteer-core";

import { ViteServer } from "./support/ViteServer.mjs";

const CHROME_EXECUTABLE = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_PATH = "artifacts/e2e/first-navigable-map-failure.png";

test("First Navigable Map works in local headless Chrome", async () => {
    const server = new ViteServer();
    let browser;
    let page;
    let failed = false;

    try {
        await server.start();
        browser = await puppeteer.launch({
            executablePath: CHROME_EXECUTABLE,
            headless: true,
            args: [
                "--disable-background-networking",
                "--disable-component-update",
                "--disable-default-apps",
                "--disable-sync",
                "--no-first-run",
            ],
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1100, height: 760 });
        await page.setRequestInterception(true);
        const serverOrigin = new globalThis.URL(server.url).origin;
        const externalRequests = [];
        page.on("request", (request) => {
            const requestUrl = new globalThis.URL(request.url());
            if (requestUrl.origin !== serverOrigin) {
                externalRequests.push(request.url());
                void request.abort();
                return;
            }
            if (requestUrl.pathname === "/favicon.ico") {
                void request.respond({ status: 204 });
                return;
            }
            void request.continue();
        });

        const pageErrors = [];
        const consoleErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("console", (message) => {
            if (message.type() === "error") {
                consoleErrors.push(message.text());
            }
        });

        const response = await page.goto(server.url, { waitUntil: "networkidle0" });
        assert.ok(response, "Navigation must return an HTTP response.");
        assert.equal(response.status(), 200);
        assert.equal(await page.title(), "EchoAtlas — Geographic World");
        await page.waitForSelector("canvas");
        assert.equal(
            await page.$eval(".atlas-brand h1", (element) => element.textContent),
            "EchoAtlas"
        );
        assert.equal(
            await page.$eval(".atlas-brand p", (element) => element.textContent),
            "Cartographie musicale"
        );
        assert.equal(
            await page.$eval(".atlas-map__help", (element) => element.textContent),
            "Drag to explore · Scroll to zoom"
        );
        assert.equal(await page.$eval(".atlas-journey dd", (element) => element.textContent), "47");

        const initial = await canvasState(page);
        assert.ok(initial.cssWidth > 0 && initial.cssHeight > 0);
        assert.ok(initial.width > 0 && initial.height > 0);
        assert.ok(initial.visibleLabels > 0, "The initial atlas view must render semantic labels.");
        assert.equal(
            initial.visibleLocations,
            initial.visibleLabels,
            "Every initial marker must have an accepted label."
        );

        assert.equal(
            await clickFirstLocation(page, initial),
            true,
            "A real marker must be selectable."
        );
        await page.waitForFunction(
            (initialWidth) => {
                const panel = globalThis.document.querySelector(".selection-panel");
                const canvas = globalThis.document.querySelector("canvas");
                return (
                    panel !== null &&
                    !panel.hidden &&
                    canvas !== null &&
                    canvas.getBoundingClientRect().width < initialWidth
                );
            },
            {},
            initial.cssWidth
        );
        const firstSelection = await selectionState(page);
        assert.equal(firstSelection.visible, true, "Selecting a marker must open its Music panel.");
        assertSelectionMatchesIdentity(firstSelection);
        assert.equal(firstSelection.entityKind, "artist");
        const connectionCount = await page.$$eval(
            ".selection-panel__connection",
            (connections) => connections.length
        );
        assert.ok(connectionCount > 0, "The selected Artist must expose real graph connections.");

        const selectedCanvas = await canvasState(page);
        await page.click(".selection-panel__connection");
        await page.waitForFunction(
            (selectedId) =>
                globalThis.document.querySelector(".selection-panel")?.dataset.selectedId !==
                selectedId,
            {},
            firstSelection.selectedId
        );
        const secondSelection = await selectionState(page);
        assertSelectionMatchesIdentity(secondSelection);
        assert.notEqual(secondSelection.selectedId, firstSelection.selectedId);
        assert.notEqual(secondSelection.title, firstSelection.title);
        assert.equal(
            (await canvasState(page)).dataUrl,
            selectedCanvas.dataUrl,
            "Semantic panel navigation must not move or redraw the Camera."
        );

        await page.click(".selection-panel__close");
        await page.waitForFunction(
            (selectedWidth) => {
                const panel = globalThis.document.querySelector(".selection-panel");
                const canvas = globalThis.document.querySelector("canvas");
                return (
                    panel !== null &&
                    panel.hidden &&
                    canvas !== null &&
                    canvas.getBoundingClientRect().width > selectedWidth
                );
            },
            {},
            selectedCanvas.cssWidth
        );
        assert.equal((await selectionState(page)).visible, false);

        await page.mouse.move(initial.x + initial.cssWidth / 2, initial.y + initial.cssHeight / 2);
        await page.mouse.wheel({ deltaY: -420 });
        await renderedFrames(page);
        const afterZoom = await canvasState(page);
        assert.notEqual(
            afterZoom.dataUrl,
            initial.dataUrl,
            "A browser wheel event must redraw the map."
        );
        assert.equal(afterZoom.visibleLocations, afterZoom.visibleLabels);

        await page.mouse.move(
            afterZoom.x + afterZoom.cssWidth / 2,
            afterZoom.y + afterZoom.cssHeight / 2
        );
        await page.mouse.down();
        await page.mouse.move(
            afterZoom.x + afterZoom.cssWidth / 2 + 140,
            afterZoom.y + afterZoom.cssHeight / 2 + 80,
            { steps: 8 }
        );
        await page.mouse.up();
        await renderedFrames(page);
        const afterPan = await canvasState(page);
        assert.notEqual(afterPan.dataUrl, afterZoom.dataUrl, "A browser drag must redraw the map.");

        await page.setViewport({ width: 900, height: 640 });
        await page.waitForFunction(() => {
            const canvas = globalThis.document.querySelector("canvas");
            const viewport = globalThis.document.querySelector(".atlas-map__viewport");
            return (
                canvas !== null &&
                viewport !== null &&
                canvas.getBoundingClientRect().width === viewport.getBoundingClientRect().width
            );
        });
        await renderedFrames(page);
        const afterResize = await canvasState(page);
        assert.ok(afterResize.cssWidth > 0 && afterResize.cssWidth < 900);
        assert.ok(afterResize.cssHeight > 0 && afterResize.cssHeight < 640);
        assert.equal(afterResize.width, Math.round(afterResize.cssWidth * afterResize.dpr));
        assert.equal(afterResize.height, Math.round(afterResize.cssHeight * afterResize.dpr));
        assert.notEqual(afterResize.dataUrl, afterPan.dataUrl, "Resize must produce a new frame.");

        assert.deepEqual(pageErrors, []);
        assert.deepEqual(consoleErrors, []);
        assert.deepEqual(externalRequests, []);
    } catch (error) {
        failed = true;
        if (page !== undefined) {
            await mkdir("artifacts/e2e", { recursive: true });
            await page.screenshot({ path: ARTIFACT_PATH, fullPage: true });
        }
        throw error;
    } finally {
        await browser?.close();
        await server.stop();
        if (failed) {
            process.stderr.write(`E2E failure screenshot: ${ARTIFACT_PATH}\n`);
        }
    }
});

async function canvasState(page) {
    return page.$eval("canvas", (canvas) => {
        const bounds = canvas.getBoundingClientRect();
        return {
            cssWidth: bounds.width,
            cssHeight: bounds.height,
            x: bounds.x,
            y: bounds.y,
            width: canvas.width,
            height: canvas.height,
            dpr: globalThis.window.devicePixelRatio,
            visibleLabels: Number(canvas.dataset.visibleLabels ?? 0),
            visibleLocations: Number(canvas.dataset.visibleLocations ?? 0),
            dataUrl: canvas.toDataURL(),
        };
    });
}

async function clickFirstLocation(page, canvas, excludedId = undefined) {
    const spacing = 12;
    for (let y = canvas.cssHeight * 0.05; y < canvas.cssHeight * 0.95; y += spacing) {
        for (let x = canvas.cssWidth * 0.05; x < canvas.cssWidth * 0.95; x += spacing) {
            await page.mouse.click(canvas.x + x, canvas.y + y);
            const selected = await page.$eval(".selection-panel", (element) => ({
                visible: !element.hidden,
                selectedId: element.dataset.selectedId,
            }));
            if (selected.visible && selected.selectedId !== excludedId) {
                return true;
            }
        }
    }
    return false;
}

async function selectionState(page) {
    return page.$eval(".selection-panel", (element) => ({
        visible: !element.hidden,
        selectedId: element.dataset.selectedId ?? "",
        entityKind: element.dataset.entityKind ?? "",
        kind: element.querySelector(".selection-panel__kind")?.textContent ?? "",
        title: element.querySelector("h2")?.textContent ?? "",
    }));
}

function assertSelectionMatchesIdentity(selection) {
    const [, identityKind] = selection.selectedId.split(":");
    assert.ok(selection.title.length > 0, "The selected Music title must be visible.");
    assert.equal(selection.entityKind, identityKind);
    assert.equal(selection.kind.toLowerCase(), identityKind);
}

async function renderedFrames(page) {
    await page.evaluate(
        () =>
            new Promise((resolve) => {
                globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve));
            })
    );
}
