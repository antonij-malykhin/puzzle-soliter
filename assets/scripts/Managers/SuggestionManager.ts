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
     * Uses one free suggestion, or buys one for coins when the free pool is empty.
     * A successfully provided suggestion is reported through 'SuggestionProvided';
     * PuzzleManager reacts by publishing the matching pair via 'SuggestionResult'.
     */
    public async provideSuggestion(): Promise<boolean> {
        if (this.suggestionCount > 0) {
            await this.consumeSuggestion();
            return true;
        }

        if (this.progressionManager.getCoins() < this.suggestionPrice) {
            return false;
        }

        await this.progressionManager.spendCoins(this.suggestionPrice);
        await this.consumeSuggestion();
        return true;
    }

    private async consumeSuggestion(): Promise<void> {
        this.suggestionCount = Math.max(0, this.suggestionCount - 1);
        await this.progressionManager.setSuggestionCount(this.suggestionCount);
        this.eventBus.emit('SuggestionProvided', { newCount: this.suggestionCount });
    }
}
