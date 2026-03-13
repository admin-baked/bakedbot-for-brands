import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';
import {
    FirebaseStorageBlobStore,
    FirestorePlaybookAdapter,
    createPlaybookArtifactRepoStore,
} from '@/server/services/playbook-infra-adapters';

let metadataStore: FirestorePlaybookAdapter | null = null;
let blobStore: FirebaseStorageBlobStore | null = null;
let repoStore: ReturnType<typeof createPlaybookArtifactRepoStore> | null = null;
let artifactService: ArtifactPersistenceService | null = null;

export function getPlaybookArtifactRuntime() {
    if (!metadataStore || !blobStore || !repoStore || !artifactService) {
        metadataStore = new FirestorePlaybookAdapter();
        blobStore = new FirebaseStorageBlobStore();
        repoStore = createPlaybookArtifactRepoStore();
        artifactService = new ArtifactPersistenceService(blobStore, metadataStore, repoStore);
    }

    return {
        metadataStore,
        blobStore,
        repoStore,
        artifactService,
    };
}
