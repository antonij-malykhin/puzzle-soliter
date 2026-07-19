export interface GameProgress {
    completedLevelIds: string[];
    starsByLevel: Record<string, number>;
    bestTimeByLevelSeconds: Record<string, number>;
}

export const createDefaultGameProgress = (): GameProgress => ({
    completedLevelIds: [],
    starsByLevel: {},
    bestTimeByLevelSeconds: {},
});
