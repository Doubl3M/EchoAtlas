export { MusicCatalog } from "./MusicCatalog";
export { MusicActivity, MusicActivityProjector, MusicActivitySnapshot } from "./activity";
export type {
    MusicActivityOptions,
    MusicActivityProjectionInput,
    MusicActivityProjectorOptions,
    MusicActivityRulesVersion,
    MusicActivityState,
} from "./activity";
export { MusicEntity } from "./MusicEntity";
export type { MusicEntityKind, MusicEntityOptions } from "./MusicEntity";
export { MusicInterpreter } from "./MusicInterpreter";
export {
    musicKnowledgeNodeId,
    musicKnowledgeNodeKind,
    musicKnowledgeRelationKind,
} from "./MusicKnowledgeIdentity";
export { MusicRelation } from "./MusicRelation";
export type { MusicRelationOptions } from "./MusicRelation";
export {
    getStructuralMusicRelationKindV1,
    isStructuralMusicRelationV1,
} from "./MusicStructuralRelation";
export type { MusicStructuralRelationDescriptor } from "./MusicStructuralRelation";
export { ListeningEvent, ListeningHistory } from "./listening";
export type { ListeningEventOptions } from "./listening";
export { TemporalMusicProjector, TemporalMusicSnapshot } from "./temporal";
export type {
    TemporalMusicProjectionInput,
    TemporalMusicProjectorOptions,
    TemporalMusicRulesVersion,
} from "./temporal";
