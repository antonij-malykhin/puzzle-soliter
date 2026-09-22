import { ProgressionManager } from './ProgressionManager';
import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { DEFAULT_SUGGESTION_COUNT, DEFAULT_SUGGESTION_PRICE } from '../Core/Config/GameConstants';

export class SuggestionManager {
    private suggestionCount: number;

    public constructor(
        private readonly progressionManager: ProgressionManager,
        private readonly eventBus: EventBus<GameEventMap>,
        suggestionCount: number = DEFAULT_SUGGESTION_COUNT,
        public readonly suggestionPrice: number = DEFAULT_SUGGESTION_PRICE,
    ) {
        this.suggestionCount = suggestionCount;
    }

    public async initialize(): Promise<void> {
        this.suggestionCount = this.progressionManager.getSuggestionCount();
    }

    public isSuggestionAvailable(): boolean {
        return this.suggestionCount > 0;
    }

    public getSuggestionCount(): number {
        return this.suggestionCount;
    }

    /**
     * Uses one suggestion if available.
     * Reports through 'SuggestionCountChanged' and 'SuggestionProvided';
     * PuzzleManager reacts by publishing the matching pair via 'SuggestionResult'.
     */
    public async provideSuggestion(): Promise<boolean> {
        if (this.suggestionCount > 0) {
            await this.consumeSuggestion();
            return true;
        }

        return false;
    }

    /**
     * Buys one suggestion for coins, increasing the available count.
     * Reports through 'SuggestionCountChanged'.
     */
    public async buySuggestion(): Promise<boolean> {
        if (this.progressionManager.getCoins() < this.suggestionPrice) {
            return false;
        }

        await this.progressionManager.spendCoins(this.suggestionPrice);
        this.suggestionCount += 1;
        await this.progressionManager.setSuggestionCount(this.suggestionCount);
        this.eventBus.emit('SuggestionCountChanged', { newCount: this.suggestionCount });
        return true;
    }

    private async consumeSuggestion(): Promise<void> {
        this.suggestionCount = Math.max(0, this.suggestionCount - 1);
        await this.progressionManager.setSuggestionCount(this.suggestionCount);
        this.eventBus.emit('SuggestionCountChanged', { newCount: this.suggestionCount });
        this.eventBus.emit('SuggestionProvided', { newCount: this.suggestionCount });
    }
}
