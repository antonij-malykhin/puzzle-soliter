export interface GameProgress {
    completedLevelIds: string[];
    starsByLevel: Record<string, number>;
    bestTimeByLevelSeconds: Record<string, number>;
    currentLevelId: string | null;
    recentlyCompletedLevelId: string | null;
    regionNumber: number;
}

export const createDefaultGameProgress = (): GameProgress => ({
    completedLevelIds: [],
    starsByLevel: {},
    bestTimeByLevelSeconds: {},
    currentLevelId: null,
    recentlyCompletedLevelId: null,
    regionNumber: 1,
});
