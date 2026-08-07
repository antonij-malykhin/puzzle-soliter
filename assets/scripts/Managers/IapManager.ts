import { YandexConfig } from '../Core/Config/YandexConfig';
import { YandexService } from '../Services/YandexService';
import { ProgressionManager } from './ProgressionManager';
import { SettingsManager } from './SettingsManager';

/**
 * Обрабатывает все покупки через Yandex Payments:
 * покупка валюты, отключение рекламы и восстановление покупок.
 */
export class IapManager {
    public constructor(
        private readonly yandexService: YandexService,
        private readonly progressionManager: ProgressionManager,
        private readonly settingsManager: SettingsManager,
    ) {}

    public async initialize(): Promise<void> {
        await this.restorePurchases();
    }

    public async buyCoins(packIndex: number): Promise<void> {
        const pack = YandexConfig.coinPacks[packIndex];
        if (!pack) {
            return;
        }

        const purchase = await this.yandexService.purchase(pack.productId);
        if (!purchase) {
            return;
        }

        await this.progressionManager.addCoins(pack.coins);
        await this.yandexService.consumePurchase(purchase.purchaseToken);
    }

    public async buyRemoveAds(): Promise<void> {
        const purchase = await this.yandexService.purchase(YandexConfig.removeAdsProductId);
        if (!purchase) {
            return;
        }

        await this.applyRemoveAds();
    }

    private async restorePurchases(): Promise<void> {
        const purchases = await this.yandexService.getPurchases();

        for (const purchase of purchases) {
            if (purchase.productID === YandexConfig.removeAdsProductId) {
                await this.applyRemoveAds();
                continue;
            }

            const pack = YandexConfig.coinPacks.find((candidate) => candidate.productId === purchase.productID);
            if (pack) {
                await this.progressionManager.addCoins(pack.coins);
                await this.yandexService.consumePurchase(purchase.purchaseToken);
            }
        }
    }

    private async applyRemoveAds(): Promise<void> {
        const settings = this.settingsManager.getSettings();
        if (settings.adsDisabled) {
            return;
        }

        await this.settingsManager.updateSettings({ ...settings, adsDisabled: true });
    }
}