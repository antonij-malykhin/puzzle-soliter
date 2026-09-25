import { GameProgress } from '../Data/Models/GameProgress';
import { SaveManager } from './SaveManager';
import { LevelService } from '../Services/LevelService';
import { WalletManager } from './WalletManager';
import { LEVELS_PER_REGION, MAX_REGIONS } from '../Core/Config/GameConstants';

export class ProgressionManager {
    private progress: GameProgress | null = null;
    private orderedLevelIds: string[] = [];
    private debugTargetLevelId: string | null = null;
    private debugOrderedLevelIds: string[] | null = null;
    private debugRegionNumber: number | null = null;

    public constructor(
        private readonly saveManager: SaveManager,
        private readonly levelService: LevelService,
        private readonly walletManager: WalletManager,
    ) {}

    public async initialize(): Promise<void> {
        this.progress = await this.saveManager.loadProgress();
        this.walletManager.setBalance(this.progress.coins);
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

    public getCoins(): number {
        return this.requireProgress().coins;
    }

    public getSuggestionCount(): number {
        return this.requireProgress().suggestionCount;
    }

    public async setSuggestionCount(count: number): Promise<void> {
        const suggestionCount = Math.max(0, count);
        this.requireProgress().suggestionCount = suggestionCount;
        await this.save();
    }

    public async addCoins(amount: number): Promise<void> {
        if (amount <= 0) {
            return;
        }

        const progress = this.requireProgress();
        progress.coins += amount;
        await this.save();
        this.walletManager.addBalance(amount);
    }

    public async spendCoins(amount: number): Promise<void> {
        if (amount <= 0) {
            return;
        }

        const progress = this.requireProgress();
        if (amount > progress.coins) {
            throw new Error('Insufficient balance');
        }

        progress.coins -= amount;
        await this.save();
        this.walletManager.decreaseBalance(amount);
    }

    public getOrderedLevelIds(): ReadonlyArray<string> {
        return this.getActiveOrderedLevelIds();
    }

    public getCurrentRegionNumber(): number {
        if (this.getValidDebugTargetLevelId() && this.debugRegionNumber) {
            return this.debugRegionNumber;
        }

        return this.requireProgress().regionNumber;
    }

    public getCurrentLevelId(): string {
        const debugTargetLevelId = this.getValidDebugTargetLevelId();
        if (debugTargetLevelId) {
            return debugTargetLevelId;
        }

        const levelId = this.requireProgress().currentLevelId;
        if (levelId && this.orderedLevelIds.indexOf(levelId) >= 0) {
            return levelId;
        }

        return this.getFirstIncompleteLevelId();
    }

    public getCurrentLevelNumber(): number {
        const currentLevelId = this.getCurrentLevelId();
        const match = currentLevelId.match(/level-(\d+)/);
        return match ? Number(match[1]) : 0;
    }

    public getSavedCurrentLevelId(): string {
        const levelId = this.requireProgress().currentLevelId;
        if (levelId && this.orderedLevelIds.indexOf(levelId) >= 0) {
            return levelId;
        }

        return this.getFirstIncompleteLevelId();
    }

    public getDebugTargetLevelId(): string | null {
        return this.getValidDebugTargetLevelId();
    }

    public async setDebugTargetLevelId(levelId: string): Promise<boolean> {
        if (this.orderedLevelIds.indexOf(levelId) >= 0) {
            this.debugOrderedLevelIds = this.orderedLevelIds;
            this.debugRegionNumber = this.requireProgress().regionNumber;
            this.debugTargetLevelId = levelId;
            return true;
        }

        const targetRegionNumber = this.resolveRegionNumberForLevelId(levelId);
        if (!targetRegionNumber) {
            return false;
        }

        const targetOrderedLevelIds = await this.levelService.getOrderedLevelIds(targetRegionNumber);
        if (targetOrderedLevelIds.indexOf(levelId) < 0) {
            return false;
        }

        this.debugOrderedLevelIds = [...targetOrderedLevelIds];
        this.debugRegionNumber = targetRegionNumber;
        this.debugTargetLevelId = levelId;
        return true;
    }

    public clearDebugTargetLevelId(): void {
        this.debugTargetLevelId = null;
        this.debugOrderedLevelIds = null;
        this.debugRegionNumber = null;
    }

    public async selectLevel(levelId: string): Promise<void> {
        if (this.orderedLevelIds.indexOf(levelId) < 0 || !this.isUnlocked(levelId)) {
            return;
        }

        this.requireProgress().currentLevelId = levelId;
        await this.save();
    }

    public isUnlocked(levelId: string): boolean {
        const activeOrderedLevelIds = this.getActiveOrderedLevelIds();
        const levelIndex = activeOrderedLevelIds.indexOf(levelId);
        if (levelIndex < 0) {
            return false;
        }

        if (levelIndex === 0) {
            return true;
        }

        const previousLevelId = activeOrderedLevelIds[levelIndex - 1];
        return this.getCompletedLevelIdsView().indexOf(previousLevelId) >= 0;
    }

    public isCompleted(levelId: string): boolean {
        return this.getCompletedLevelIdsView().indexOf(levelId) >= 0;
    }

    public async markRegionCompleted(): Promise<void> {
        if (this.getValidDebugTargetLevelId()) {
            return;
        }

        const progress = this.requireProgress();
        for (const levelId of this.orderedLevelIds) {
            if (progress.completedLevelIds.indexOf(levelId) < 0) {
                await this.markLevelCompleted(levelId, 0);
            }
        }
        await this.save();
    }

    public async markLevelCompleted(levelId: string, elapsedSeconds: number): Promise<void> {
        if (this.getValidDebugTargetLevelId()) {
            return;
        }

        const progress = this.requireProgress();
        const isFirstCompletion = progress.completedLevelIds.indexOf(levelId) < 0;
        if (isFirstCompletion) {
            progress.completedLevelIds.push(levelId);
        }

        const currentBest = progress.bestTimeByLevelSeconds[levelId];
        if (!currentBest || elapsedSeconds < currentBest) {
            progress.bestTimeByLevelSeconds[levelId] = elapsedSeconds;
        }

        progress.recentlyCompletedLevelId = levelId;
        progress.currentLevelId = this.getFirstIncompleteLevelId();
        await this.save();

        if (isFirstCompletion) {
            const levelData = await this.levelService.getLevel(levelId);
            await this.addCoins(levelData.rewardCoins ?? 0);
        }
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

    public isCurrentRegionCompleted(): boolean {
        const activeOrderedLevelIds = this.getActiveOrderedLevelIds();
        return (
            activeOrderedLevelIds.length > 0 &&
            activeOrderedLevelIds.every(
                (levelId) => this.getCompletedLevelIdsView().indexOf(levelId) >= 0,
            )
        );
    }

    public async advanceToNextRegion(): Promise<void> {
        if (this.getValidDebugTargetLevelId()) {
            return;
        }

        const progress = this.requireProgress();
        if (progress.regionNumber >= MAX_REGIONS) {
            return;
        }

        progress.regionNumber += 1;
        this.orderedLevelIds = [
            ...(await this.levelService.getOrderedLevelIds(progress.regionNumber)),
        ];

        if (this.orderedLevelIds.length === 0) {
            this.orderedLevelIds = [this.levelService.getTrainingLevelId()];
        }

        progress.currentLevelId = this.getFirstIncompleteLevelId();
        progress.recentlyCompletedLevelId = null;
        await this.save();
    }

    private getFirstIncompleteLevelId(): string {
        const progress = this.requireProgress();
        const firstIncomplete = this.orderedLevelIds.find(
            (levelId) => progress.completedLevelIds.indexOf(levelId) < 0,
        );
        return firstIncomplete ?? this.orderedLevelIds[0];
    }

    private getCompletedLevelIdsView(): ReadonlyArray<string> {
        const debugTargetLevelId = this.getValidDebugTargetLevelId();
        if (!debugTargetLevelId) {
            return this.requireProgress().completedLevelIds;
        }

        const activeOrderedLevelIds = this.getActiveOrderedLevelIds();
        const targetIndex = activeOrderedLevelIds.indexOf(debugTargetLevelId);
        return targetIndex >= 0
            ? activeOrderedLevelIds.slice(0, targetIndex)
            : this.requireProgress().completedLevelIds;
    }

    private getActiveOrderedLevelIds(): ReadonlyArray<string> {
        return this.getValidDebugTargetLevelId() && this.debugOrderedLevelIds
            ? this.debugOrderedLevelIds
            : this.orderedLevelIds;
    }

    private resolveRegionNumberForLevelId(levelId: string): number | null {
        const match = levelId.match(/^level-(\d+)$/);
        if (!match) {
            return null;
        }

        const levelNumber = Number(match[1]);
        return Math.floor((levelNumber - 1) / LEVELS_PER_REGION) + 1;
    }

    private getValidDebugTargetLevelId(): string | null {
        if (!this.debugTargetLevelId || !this.debugOrderedLevelIds) {
            return null;
        }

        if (this.debugOrderedLevelIds.indexOf(this.debugTargetLevelId) >= 0) {
            return this.debugTargetLevelId;
        }

        this.clearDebugTargetLevelId();
        return null;
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
