import { _decorator, Button, Component, Label, Node } from 'cc';
import { YandexConfig } from '../../Core/Config/YandexConfig';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { IapManager } from '../../Managers/IapManager';
import { YandexService } from '../../Services/YandexService';

const { ccclass, property } = _decorator;

/**
 * Магазин IAP: паки валюты и отключение рекламы.
 * Все кнопки и подписи подключаются через инспектор, код не создаёт узлы.
 */
@ccclass('ShopUI')
export class ShopUI extends Component {
    @property(Node)
    private panel: Node | null = null;

    @property(Button)
    private openButton: Button | null = null;

    @property(Button)
    private closeButton: Button | null = null;

    @property([Button])
    private coinPackButtons: Button[] = [];

    @property([Label])
    private coinPackPriceLabels: Label[] = [];

    @property(Button)
    private removeAdsButton: Button | null = null;

    private purchaseInProgress = false;

    protected onLoad(): void {
        this.openButton?.node.on(Button.EventType.CLICK, this.openPanel, this);
        this.closeButton?.node.on(Button.EventType.CLICK, this.closePanel, this);
        this.removeAdsButton?.node.on(Button.EventType.CLICK, this.onRemoveAdsClicked, this);

        this.coinPackButtons.forEach((button, index) => {
            button.node.on(Button.EventType.CLICK, () => this.onCoinPackClicked(index), this);
        });
    }

    protected onEnable(): void {
        void this.loadCatalog();
    }

    protected onDestroy(): void {
        if (this.openButton?.node) {
            this.openButton?.node.off(Button.EventType.CLICK, this.openPanel, this);
        }
        if (this.closeButton?.node) {
            this.closeButton?.node.off(Button.EventType.CLICK, this.closePanel, this);
        }
        if (this.removeAdsButton?.node) {
            this.removeAdsButton?.node.off(Button.EventType.CLICK, this.onRemoveAdsClicked, this);
        }

        this.coinPackButtons.forEach((button, index) => {
            if (button?.node) {
                button.node.off(Button.EventType.CLICK, () => this.onCoinPackClicked(index), this);
            }
        });
    }

    private async loadCatalog(): Promise<void> {
        const products = await ServiceContainer.get(YandexService).getCatalog();

        this.coinPackPriceLabels.forEach((label, index) => {
            const pack = YandexConfig.coinPacks[index];
            if (!pack) {
                return;
            }

            const product = products.find((candidate) => candidate.id === pack.productId);
            if (product) {
                label.string = product.price;
            }
        });
    }

    private async onCoinPackClicked(packIndex: number): Promise<void> {
        if (this.purchaseInProgress) {
            return;
        }

        this.purchaseInProgress = true;
        await ServiceContainer.get(IapManager).buyCoins(packIndex);
        this.purchaseInProgress = false;
    }

    private async onRemoveAdsClicked(): Promise<void> {
        if (this.purchaseInProgress) {
            return;
        }

        this.purchaseInProgress = true;
        await ServiceContainer.get(IapManager).buyRemoveAds();
        this.purchaseInProgress = false;
    }

    private openPanel(): void {
        if (this.panel) {
            this.panel.active = true;
        }
    }

    private closePanel(): void {
        if (this.panel) {
            this.panel.active = false;
        }
    }
}