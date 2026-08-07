import { EventBus } from "../Core/Events/EventBus";
import { GameEventMap } from "../Core/Events/GameEventMap";

export class WalletManager {
    private balance: number = 0;
    private eventBus: EventBus<GameEventMap>;

    constructor(eventBus: EventBus<GameEventMap>) {
        this.eventBus = eventBus;
    }

    public setBalance(amount: number): void {
        if (amount < 0) {
            throw new Error("Balance cannot be negative");
        }

        this.balance = amount;
        this.eventBus.emit('WalletBalanceChanged', { newBalance: this.balance });
    }

    public addBalance(amount: number): void {
        if (amount < 0) {
            throw new Error("Amount to add cannot be negative");
        }

        this.balance += amount;
        this.eventBus.emit('WalletBalanceChanged', { newBalance: this.balance });
    }

    public decreaseBalance(amount: number): void {
        if (amount > this.balance) {
            throw new Error("Insufficient balance");
        }

        if (amount < 0) {
            throw new Error("Amount to decrease cannot be negative");
        }

        this.balance -= amount;
        this.eventBus.emit('WalletBalanceChanged', { newBalance: this.balance });
    }

    public getBalance(): number {
        return this.balance;
    }
}