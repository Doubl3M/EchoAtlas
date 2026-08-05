import type { EngineContext } from "./EngineContext";

export interface EngineService {
    initialize(context: EngineContext): Promise<void> | void;
    dispose(): Promise<void> | void;
}
