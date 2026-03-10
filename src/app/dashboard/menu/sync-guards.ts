export function getTrustedSyncCount(params: {
    staleDeletionSkipped: boolean;
    previousSyncCount: number | null;
    currentSyncCount: number;
}): number {
    if (params.staleDeletionSkipped && params.previousSyncCount !== null) {
        return params.previousSyncCount;
    }
    return params.currentSyncCount;
}
