import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4175;
const MAX_READY_ATTEMPTS = 100;
const READY_RETRY_DELAY_MS = 50;
const STOP_TIMEOUT_MS = 2_000;

export class ViteServer {
    #output = "";
    #process;
    #exit;
    #port;

    constructor(port = DEFAULT_PORT) {
        this.#port = port;
    }

    get url() {
        return `http://${HOST}:${this.#port}/`;
    }

    async start() {
        if (this.#process !== undefined) {
            throw new Error("Vite server is already running.");
        }

        this.#process = spawn(
            process.execPath,
            [
                "node_modules/vite/bin/vite.js",
                "--host",
                HOST,
                "--port",
                String(this.#port),
                "--strictPort",
            ],
            { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] }
        );
        this.#process.stdout.setEncoding("utf8");
        this.#process.stderr.setEncoding("utf8");
        this.#process.stdout.on("data", (chunk) => (this.#output += chunk));
        this.#process.stderr.on("data", (chunk) => (this.#output += chunk));
        this.#exit = new Promise((resolve) => this.#process.once("exit", resolve));

        for (let attempt = 0; attempt < MAX_READY_ATTEMPTS; attempt += 1) {
            if (this.#process.exitCode !== null) {
                throw new Error(`Vite exited before becoming ready.\n${this.#output}`);
            }
            try {
                const response = await globalThis.fetch(this.url);
                if (response.ok) {
                    return;
                }
            } catch (error) {
                if (!(error instanceof TypeError)) {
                    throw error;
                }
            }
            await delay(READY_RETRY_DELAY_MS);
        }

        throw new Error(`Vite did not become ready.\n${this.#output}`);
    }

    async stop() {
        const child = this.#process;
        const exit = this.#exit;
        this.#process = undefined;
        this.#exit = undefined;
        if (child === undefined || exit === undefined || child.exitCode !== null) {
            return;
        }

        child.kill("SIGTERM");
        const stopped = await Promise.race([exit.then(() => true), delay(STOP_TIMEOUT_MS, false)]);
        if (!stopped && child.exitCode === null) {
            child.kill("SIGKILL");
            await exit;
        }
    }
}
