import { WalletManager } from "./WalletManager";
import { EventBus } from "../Core/Events/EventBus";
import { GameEventMap } from "../Core/Events/GameEventMap";
export class SuggestionManager {
    private wallet: WalletManager;
    private eventBus: EventBus<GameEventMap>;
    private suggestionAvailable: boolean = true;
    private suggestionCount: number = 3;
    private suggestionPrice: number = 10; // Example price for a suggestion

    constructor(wallet: WalletManager, eventBus: EventBus<GameEventMap>, suggestionCount: number = 3, suggestionPrice: number = 10) {
        this.wallet = wallet;
        this.eventBus = eventBus;
        this.suggestionCount = suggestionCount;
        this.suggestionPrice = suggestionPrice;
    }

    public isSuggestionAvailable(): boolean {
        return this.suggestionAvailable && this.suggestionCount > 0;
    }

    public provideSuggestion(): void {
        if (this.isSuggestionAvailable()) {
            this.suggestionCount--;
            this.eventBus.emit('SuggestionProvided', { newCount: this.suggestionCount });
        } else if (this.suggestionAvailable && this.suggestionCount === 0) {
            if (this.wallet.getBalance() >= this.suggestionPrice) {
                this.wallet.decreaseBalance(this.suggestionPrice);
                this.suggestionCount++;
            } else {
                this.suggestionAvailable = false;
            }
        }
    }
}