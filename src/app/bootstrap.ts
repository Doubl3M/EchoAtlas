import { Application } from "./Application";

export async function bootstrap(): Promise<Application> {
    const application = new Application([], {
        applicationName: "EchoAtlas",
    });
    const result = await application.start();

    if (!result.ok) {
        throw result.error;
    }

    return application;
}
