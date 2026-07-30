export interface GameProgress {
    completedLevelIds: string[];
    starsByLevel: Record<string, number>;
    bestTimeByLevelSeconds: Record<string, number>;
    currentLevelId: string | null;
    recentlyCompletedLevelId: string | null;
}

export const createDefaultGameProgress = (): GameProgress => ({
    completedLevelIds: [],
    starsByLevel: {},
    bestTimeByLevelSeconds: {},
    currentLevelId: null,
    recentlyCompletedLevelId: null,
});
