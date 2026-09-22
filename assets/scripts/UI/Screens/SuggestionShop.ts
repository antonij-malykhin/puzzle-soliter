import { _decorator, Button, Component, Label, Node } from 'cc';
import { EventBus } from '../../Core/Events/EventBus';
import { GameEventMap } from '../../Core/Events/GameEventMap';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { WalletManager } from '../../Managers/WalletManager';

const { ccclass, property } = _decorator;

@ccclass('SuggestionShop')
export class SuggestionShop extends Component {
    @property(Node)
    private rootNode: Node | null = null;

    @property(Button)
    private buyButton: Button | null = null;

    @property(Button)
    private closeButton: Button | null = null;

    @property(Label)
    private priceLabel: Label | null = null;

    @property(Label)
    private coinsLabel: Label | null = null;

    private onBuyRequested: (() => Promise<boolean>) | null = null;
    private disposables: Array<() => void> = [];
    private isPurchasing = false;

    protected onLoad(): void {
        this.bindButtons();
    }

    public initialize(
        eventBus: EventBus<GameEventMap>,
        suggestionPrice: number,
        currentCoins: number,
        onBuyRequested: () => Promise<boolean>,
    ): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;

        this.onBuyRequested = onBuyRequested;
        this.setPrice(suggestionPrice);
        this.setCoins(currentCoins);

        this.disposables.push(
            eventBus.on('WalletBalanceChanged', ({ newBalance }) => {
                this.setCoins(newBalance);
            }),
        );
    }

    public async show(): Promise<void> {
        this.refreshCoinsFromWallet();
        this.rootNode!.active = true;
    }

    public async hide(): Promise<void> {
        this.rootNode!.active = false;
    }

    public setPrice(price: number): void {
        if (this.priceLabel) {
            this.priceLabel.string = `${price}`;
        }
    }

    public setCoins(coins: number): void {
        if (this.coinsLabel) {
            this.coinsLabel.string = `${coins}`;
        }
    }

    private refreshCoinsFromWallet(): void {
        try {
            if (ServiceContainer.get(WalletManager)) {
                const balance = ServiceContainer.get(WalletManager).getBalance();
                this.setCoins(balance);
            }
        } catch {
            // ServiceContainer may not have WalletManager in testing/editor
        }
    }

    private bindButtons(): void {
        this.buyButton?.node.on(Button.EventType.CLICK, this.onBuyClicked, this);
        this.closeButton?.node.on(Button.EventType.CLICK, this.onCloseClicked, this);
    }

    private async onBuyClicked(): Promise<void> {
        if (this.isPurchasing) {
            return;
        }

        this.isPurchasing = true;
        try {
            await this.onBuyRequested?.();
        } finally {
            this.isPurchasing = false;
        }
    }

    private onCloseClicked(): void {
        void this.hide();
    }

    protected onDestroy(): void {
        if (this.buyButton?.node) {
            this.buyButton.node.off(Button.EventType.CLICK, this.onBuyClicked, this);
        }
        if (this.closeButton?.node) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseClicked, this);
        }

        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;
    }
}
