import { describe, expect, it } from "vitest";

import { Application } from "../../src/app";
import type { EngineContext, EngineService } from "../../src/engine/core";

class RecordedService implements EngineService {
    public constructor(
        private readonly name: string,
        private readonly events: string[],
        private readonly initializationError?: Error
    ) {}

    public initialize(context: EngineContext): void {
        this.events.push(`initialize:${this.name}:${context.applicationName}`);

        if (this.initializationError !== undefined) {
            throw this.initializationError;
        }
    }

    public dispose(): void {
        this.events.push(`dispose:${this.name}`);
    }
}

class DeferredInitializationService implements EngineService {
    private readonly initialization: Promise<void>;
    private resolveInitialization: (() => void) | undefined;
    public disposeCount = 0;
    public initializeCount = 0;

    public constructor() {
        this.initialization = new Promise((resolve) => {
            this.resolveInitialization = resolve;
        });
    }

    public initialize(): Promise<void> {
        this.initializeCount += 1;
        return this.initialization;
    }

    public dispose(): void {
        this.disposeCount += 1;
    }

    public completeInitialization(): void {
        this.resolveInitialization?.();
    }
}

class DeferredDisposalService implements EngineService {
    private readonly disposal: Promise<void>;
    private resolveDisposal: (() => void) | undefined;
    public disposeCount = 0;

    public constructor() {
        this.disposal = new Promise((resolve) => {
            this.resolveDisposal = resolve;
        });
    }

    public initialize(): void {
        return undefined;
    }

    public dispose(): Promise<void> {
        this.disposeCount += 1;
        return this.disposal;
    }

    public completeDisposal(): void {
        this.resolveDisposal?.();
    }
}

const context: EngineContext = {
    applicationName: "EchoAtlas Test",
};

describe("Application", () => {
    it("starts successfully", async () => {
        const application = new Application([], context);

        const result = await application.start();

        expect(result).toEqual({ ok: true, value: undefined });
    });

    it("initializes services in registration order", async () => {
        const events: string[] = [];
        const application = new Application(
            [new RecordedService("first", events), new RecordedService("second", events)],
            context
        );

        await application.start();

        expect(events).toEqual([
            "initialize:first:EchoAtlas Test",
            "initialize:second:EchoAtlas Test",
        ]);
    });

    it("disposes services in reverse registration order", async () => {
        const events: string[] = [];
        const application = new Application(
            [new RecordedService("first", events), new RecordedService("second", events)],
            context
        );
        await application.start();

        const result = await application.stop();

        expect(result.ok).toBe(true);
        expect(events.slice(2)).toEqual(["dispose:second", "dispose:first"]);
    });

    it("refuses a second start", async () => {
        const application = new Application([], context);
        await application.start();

        const result = await application.start();

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.message).toBe("Application has already been started.");
        }
    });

    it("cleans up attempted services after an initialization error", async () => {
        const events: string[] = [];
        const initializationError = new Error("Initialization failed.");
        const application = new Application(
            [
                new RecordedService("first", events),
                new RecordedService("second", events, initializationError),
                new RecordedService("third", events),
            ],
            context
        );

        const result = await application.start();

        expect(result).toEqual({ error: initializationError, ok: false });
        expect(events).toEqual([
            "initialize:first:EchoAtlas Test",
            "initialize:second:EchoAtlas Test",
            "dispose:second",
            "dispose:first",
        ]);

        const stopResult = await application.stop();

        expect(stopResult.ok).toBe(false);
        expect(events).toHaveLength(4);
    });

    it("rejects concurrent lifecycle calls while starting", async () => {
        const service = new DeferredInitializationService();
        const application = new Application([service], context);

        const firstStart = application.start();
        const secondStart = await application.start();
        const concurrentStop = await application.stop();

        expect(secondStart.ok).toBe(false);
        expect(concurrentStop.ok).toBe(false);
        expect(service.initializeCount).toBe(1);
        expect(service.disposeCount).toBe(0);

        service.completeInitialization();

        expect((await firstStart).ok).toBe(true);
        expect((await application.stop()).ok).toBe(true);
        expect(service.disposeCount).toBe(1);
    });

    it("does not dispose services twice during concurrent stops", async () => {
        const service = new DeferredDisposalService();
        const application = new Application([service], context);
        await application.start();

        const firstStop = application.stop();
        const secondStop = await application.stop();

        expect(secondStop.ok).toBe(false);
        expect(service.disposeCount).toBe(1);

        service.completeDisposal();

        expect((await firstStop).ok).toBe(true);
        expect(service.disposeCount).toBe(1);
    });
});
