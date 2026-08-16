import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import test from "node:test";

import puppeteer from "puppeteer-core";

import { ViteServer } from "./support/ViteServer.mjs";

const CHROME_EXECUTABLE = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIRECTORY = "artifacts/e2e";
const BOWIE_ID = "music:artist:david-bowie";
const LOW_ID = "music:album:low";

test("Stable Demo supports the canonical EchoAtlas product journey", async () => {
    const server = new ViteServer(4176);
    let browser;
    let page;

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
        await page.setViewport({ width: 1440, height: 900 });
        await page.setRequestInterception(true);
        const origin = new globalThis.URL(server.url).origin;
        const externalRequests = [];
        page.on("request", (request) => {
            const url = new globalThis.URL(request.url());
            if (url.origin !== origin) {
                externalRequests.push(request.url());
                void request.abort();
                return;
            }
            if (url.pathname === "/favicon.ico") {
                void request.respond({ status: 204 });
                return;
            }
            void request.continue();
        });
        const pageErrors = [];
        const consoleErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
        });

        const response = await page.goto(`${server.url}demo.html`, { waitUntil: "networkidle0" });
        assert.equal(response?.status(), 200);
        assert.equal(await page.title(), "EchoAtlas — Cartographie musicale");
        await page.waitForSelector(".semantic-atlas-map svg");
        assert.equal(await page.$$(".bridge-continent").then((items) => items.length), 5);
        assert.equal(await page.$$(".bridge-district").then((items) => items.length), 9);
        assert.equal(await page.$$(".bridge-building").then((items) => items.length), 11);
        assert.equal(
            await page.$$("[data-knowledge-node-id^='music:track:']").then((items) => items.length),
            0,
            "Tracks must remain Building Contents rather than global map features."
        );
        await capture(page, "demo-latest.png");

        await clickFeature(page, BOWIE_ID, "bridge-district");
        assert.equal(await selectedKind(page), "artist");
        assert.match(await panelText(page), /Présent dans 2 territoires/);

        await clickFeature(page, LOW_ID, "bridge-building");
        assert.equal(await selectedKind(page), "album");
        const lowPanel = await panelText(page);
        assert.match(lowPanel, /Pistes à l’intérieur du bâtiment/);
        assert.match(lowPanel, /Sound and Vision/);
        assert.match(lowPanel, /Always Crashing in the Same Car/);
        await capture(page, "demo-low.png");

        await selectMilestone(page, 1);
        await clickFeature(page, BOWIE_ID, "bridge-district");
        assert.equal(
            await page.$eval(
                ".semantic-atlas-map",
                (element) => element.dataset.ruinedDistrictCount
            ),
            "3"
        );
        assert.equal(
            await page.$$eval(`[data-knowledge-node-id='${BOWIE_ID}'].bridge-district`, (items) =>
                items.every((item) => item.dataset.ruined === "true")
            ),
            true
        );
        assert.match(await panelText(page), /En sommeil dans l’Atlas/);
        await capture(page, "demo-bowie-ruined.png");

        const selectedFeatureId = await page.$eval(
            ".bridge-panel",
            (element) => element.dataset.selectedFeatureId
        );
        await selectMilestone(page, 2);
        assert.equal(
            await page.$eval(".bridge-panel", (element) => element.dataset.selectedFeatureId),
            selectedFeatureId,
            "Reactivation must preserve the selected District identity."
        );
        assert.equal(
            await page.$$eval(`[data-knowledge-node-id='${BOWIE_ID}'].bridge-district`, (items) =>
                items.every((item) => item.dataset.ruined === "false")
            ),
            true
        );
        assert.doesNotMatch(await panelText(page), /En sommeil dans l’Atlas/);

        await page.click(".semantic-radio-landmark");
        await page.waitForSelector(".selection-panel--broadcast:not([hidden])");
        const broadcastBefore = await page.$eval(
            ".broadcast-panel__playlist",
            (element) => element.textContent
        );
        assert.match(broadcastBefore ?? "", /Signals Beyond the Atlas/);
        await capture(page, "demo-radio-pirate.png");
        await selectMilestone(page, 0);
        assert.equal(
            await page.$eval(".broadcast-panel__playlist", (element) => element.textContent),
            broadcastBefore,
            "Radio Pirate must remain independent from historical time."
        );
        assert.equal(
            await page.$eval(".selection-panel--broadcast", (element) => element.hidden),
            false
        );
        await page.click(".selection-panel--broadcast .selection-panel__close");
        assert.equal(
            await page.$eval(".selection-panel--broadcast", (element) => element.hidden),
            true
        );

        assert.deepEqual(pageErrors, []);
        assert.deepEqual(consoleErrors, []);
        assert.deepEqual(externalRequests, []);
    } catch (error) {
        if (page !== undefined) await capture(page, "stable-demo-failure.png");
        throw error;
    } finally {
        await browser?.close();
        await server.stop();
    }
});

async function clickFeature(page, knowledgeNodeId, className) {
    const selector = `[data-knowledge-node-id='${knowledgeNodeId}'].${className}`;
    await page.waitForSelector(selector);
    await page.$eval(selector, (element) => element.focus());
    await page.keyboard.press("Enter");
    await page.waitForFunction(
        (id) =>
            globalThis.document.querySelector(".bridge-panel")?.dataset.selectedKnowledgeNodeId ===
            id,
        {},
        knowledgeNodeId
    );
}

async function selectMilestone(page, index) {
    await page.click(`.semantic-atlas-timeline button[data-milestone-index='${index}']`);
    await page.waitForFunction(
        (expected) =>
            globalThis.document
                .querySelector(
                    `.semantic-atlas-timeline button[data-milestone-index='${expected}']`
                )
                ?.classList.contains("is-selected") === true,
        {},
        index
    );
}

async function selectedKind(page) {
    return page.$eval(".bridge-panel", (element) => element.dataset.selectedEntityKind);
}

async function panelText(page) {
    return page.$eval(".bridge-panel", (element) => element.textContent ?? "");
}

async function capture(page, filename) {
    await mkdir(ARTIFACT_DIRECTORY, { recursive: true });
    await page.screenshot({ path: `${ARTIFACT_DIRECTORY}/${filename}` });
}
