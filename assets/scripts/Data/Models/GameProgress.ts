import { DEFAULT_SUGGESTION_COUNT } from '../../Core/Config/GameConstants';

export const DEFAULT_STARTING_COINS = 50;

export interface GameProgress {
    completedLevelIds: string[];
    starsByLevel: Record<string, number>;
    bestTimeByLevelSeconds: Record<string, number>;
    currentLevelId: string | null;
    recentlyCompletedLevelId: string | null;
    regionNumber: number;
    coins: number;
    suggestionCount: number;
}

export const createDefaultGameProgress = (): GameProgress => ({
    completedLevelIds: [],
    starsByLevel: {},
    bestTimeByLevelSeconds: {},
    currentLevelId: null,
    recentlyCompletedLevelId: null,
    regionNumber: 1,
    coins: DEFAULT_STARTING_COINS,
    suggestionCount: DEFAULT_SUGGESTION_COUNT,
});
