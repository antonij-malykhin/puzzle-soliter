import { GameProgress } from '../Data/Models/GameProgress';
import { SaveManager } from './SaveManager';
import { LevelService } from '../Services/LevelService';

export class ProgressionManager {
    private progress: GameProgress | null = null;
    private orderedLevelIds: string[] = [];

    public constructor(
        private readonly saveManager: SaveManager,
        private readonly levelService: LevelService,
    ) {}

    public async initialize(): Promise<void> {
        this.progress = await this.saveManager.loadProgress();
        this.orderedLevelIds = [...(await this.levelService.getOrderedLevelIds(this.progress.regionNumber))];

        if (this.orderedLevelIds.length === 0) {
            this.orderedLevelIds = [this.levelService.getTrainingLevelId()];
        }

        const currentLevelId = this.progress.currentLevelId;
        if (!currentLevelId || this.orderedLevelIds.indexOf(currentLevelId) < 0) {
            this.progress.currentLevelId = this.getFirstIncompleteLevelId();
            await this.save();
        }
    }

    public getOrderedLevelIds(): ReadonlyArray<string> {
        return this.orderedLevelIds;
    }

    public getCurrentRegionNumber(): number {
        return this.requireProgress().regionNumber;
    }

    public getCurrentLevelId(): string {
        const levelId = this.requireProgress().currentLevelId;
        if (levelId && this.orderedLevelIds.indexOf(levelId) >= 0) {
            return levelId;
        }

        return this.getFirstIncompleteLevelId();
    }

    public async selectLevel(levelId: string): Promise<void> {
        if (this.orderedLevelIds.indexOf(levelId) < 0 || !this.isUnlocked(levelId)) {
            return;
        }

        this.requireProgress().currentLevelId = levelId;
        await this.save();
    }

    public isUnlocked(levelId: string): boolean {
        const levelIndex = this.orderedLevelIds.indexOf(levelId);
        if (levelIndex < 0) {
            return false;
        }

        if (levelIndex === 0) {
            return true;
        }

        const progress = this.requireProgress();
        const previousLevelId = this.orderedLevelIds[levelIndex - 1];
        return progress.completedLevelIds.indexOf(previousLevelId) >= 0;
    }

    public isCompleted(levelId: string): boolean {
        return this.requireProgress().completedLevelIds.indexOf(levelId) >= 0;
    }

    public async markLevelCompleted(levelId: string, elapsedSeconds: number): Promise<void> {
        const progress = this.requireProgress();
        if (progress.completedLevelIds.indexOf(levelId) < 0) {
            progress.completedLevelIds.push(levelId);
        }

        const currentBest = progress.bestTimeByLevelSeconds[levelId];
        if (!currentBest || elapsedSeconds < currentBest) {
            progress.bestTimeByLevelSeconds[levelId] = elapsedSeconds;
        }

        progress.recentlyCompletedLevelId = levelId;
        progress.currentLevelId = this.getFirstIncompleteLevelId();
        await this.save();
    }

    public async consumeRecentlyCompletedLevelId(): Promise<string | null> {
        const progress = this.requireProgress();
        const recentlyCompletedLevelId = progress.recentlyCompletedLevelId;
        if (!recentlyCompletedLevelId) {
            return null;
        }

        progress.recentlyCompletedLevelId = null;
        await this.save();
        return recentlyCompletedLevelId;
    }

    public getProgressSnapshot(): GameProgress {
        const progress = this.requireProgress();
        return {
            completedLevelIds: [...progress.completedLevelIds],
            starsByLevel: { ...progress.starsByLevel },
            bestTimeByLevelSeconds: { ...progress.bestTimeByLevelSeconds },
            currentLevelId: progress.currentLevelId,
            recentlyCompletedLevelId: progress.recentlyCompletedLevelId,
            regionNumber: progress.regionNumber,
        };
    }

    private getFirstIncompleteLevelId(): string {
        const progress = this.requireProgress();
        const firstIncomplete = this.orderedLevelIds.find(
            (levelId) => progress.completedLevelIds.indexOf(levelId) < 0,
        );
        return firstIncomplete ?? this.orderedLevelIds[0];
    }

    private requireProgress(): GameProgress {
        if (!this.progress) {
            throw new Error('ProgressionManager is not initialized.');
        }

        return this.progress;
    }

    private async save(): Promise<void> {
        await this.saveManager.saveProgress(this.requireProgress());
    }
}
