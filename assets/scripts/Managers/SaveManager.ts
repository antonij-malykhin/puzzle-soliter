import { SAVE_PROGRESS_KEY, SAVE_SETTINGS_KEY } from '../Core/Config/GameConstants';
import { IStorageProvider } from '../Data/Interfaces/IStorageProvider';
import { createDefaultGameProgress, GameProgress } from '../Data/Models/GameProgress';
import { createDefaultGameSettings, GameSettings } from '../Data/Models/GameSettings';

export class SaveManager {
    public constructor(private readonly storageProvider: IStorageProvider) {}

    public async loadSettings(): Promise<GameSettings> {
        return (await this.storageProvider.getItem<GameSettings>(SAVE_SETTINGS_KEY)) ?? createDefaultGameSettings();
    }

    public async saveSettings(settings: GameSettings): Promise<void> {
        await this.storageProvider.setItem(SAVE_SETTINGS_KEY, settings);
    }

    public async loadProgress(): Promise<GameProgress> {
        const stored = await this.storageProvider.getItem<Partial<GameProgress>>(SAVE_PROGRESS_KEY);
        const defaults = createDefaultGameProgress();
        if (!stored) {
            return defaults;
        }

        return {
            completedLevelIds: Array.isArray(stored.completedLevelIds)
                ? [...stored.completedLevelIds]
                : defaults.completedLevelIds,
            starsByLevel: stored.starsByLevel ?? defaults.starsByLevel,
            bestTimeByLevelSeconds: stored.bestTimeByLevelSeconds ?? defaults.bestTimeByLevelSeconds,
            currentLevelId: stored.currentLevelId ?? defaults.currentLevelId,
            recentlyCompletedLevelId: stored.recentlyCompletedLevelId ?? defaults.recentlyCompletedLevelId,
            regionNumber: typeof stored.regionNumber === 'number' ? stored.regionNumber : defaults.regionNumber,
        };
    }

    public async saveProgress(progress: GameProgress): Promise<void> {
        await this.storageProvider.setItem(SAVE_PROGRESS_KEY, progress);
    }
}
