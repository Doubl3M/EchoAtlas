import type { EngineContext, EngineService } from "../engine/core";
import { failure, success, type Result } from "../shared";

type ApplicationState = "started" | "starting" | "stopped" | "stopping";

export class Application {
    private readonly context: EngineContext;
    private readonly services: readonly EngineService[];
    private state: ApplicationState = "stopped";

    public constructor(services: readonly EngineService[], context: EngineContext) {
        this.services = [...services];
        this.context = context;
    }

    public async start(): Promise<Result<void, Error>> {
        if (this.state !== "stopped") {
            return failure(new Error("Application has already been started."));
        }

        this.state = "starting";
        const attemptedServices: EngineService[] = [];

        try {
            for (const service of this.services) {
                attemptedServices.push(service);
                await service.initialize(this.context);
            }

            this.state = "started";
            return success(undefined);
        } catch (error: unknown) {
            const initializationError = this.toError(error);
            const cleanupError = await this.disposeServices(attemptedServices);
            this.state = "stopped";

            return failure(this.combineErrors(initializationError, cleanupError));
        }
    }

    public async stop(): Promise<Result<void, Error>> {
        if (this.state !== "started") {
            return failure(new Error("Application is not running."));
        }

        this.state = "stopping";
        const disposalError = await this.disposeServices(this.services);
        this.state = "stopped";

        return disposalError === undefined ? success(undefined) : failure(disposalError);
    }

    private async disposeServices(services: readonly EngineService[]): Promise<Error | undefined> {
        const errors: Error[] = [];

        for (const service of [...services].reverse()) {
            try {
                await service.dispose();
            } catch (error: unknown) {
                errors.push(this.toError(error));
            }
        }

        if (errors.length === 0) {
            return undefined;
        }

        return errors.length === 1
            ? errors[0]
            : new AggregateError(errors, "Service disposal failed.");
    }

    private combineErrors(initializationError: Error, cleanupError: Error | undefined): Error {
        if (cleanupError === undefined) {
            return initializationError;
        }

        return new AggregateError(
            [initializationError, cleanupError],
            "Application initialization and cleanup failed."
        );
    }

    private toError(error: unknown): Error {
        return error instanceof Error
            ? error
            : new Error("Unknown service error.", { cause: error });
    }
}
