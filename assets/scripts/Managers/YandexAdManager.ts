import { YandexConfig } from '../Core/Config/YandexConfig';
import { YandexService } from '../Services/YandexService';
import { ProgressionManager } from './ProgressionManager';
import { SettingsManager } from './SettingsManager';

/**
 * Полибардизация показа рекламы: троттлинг interstitial и награда за reward-видео.
 */
export class YandexAdManager {
    private lastInterstitialTimestamp = 0;

    public constructor(
        private readonly yandexService: YandexService,
        private readonly settingsManager: SettingsManager,
        private readonly progressionManager: ProgressionManager,
    ) {}

    public canShowInterstitial(): boolean {
        if (!this.yandexService.isAvailable()) {
            return false;
        }

        if (this.settingsManager.getSettings().adsDisabled) {
            return false;
        }

        const now = Date.now();
        return now - this.lastInterstitialTimestamp >= YandexConfig.interstitialMinIntervalSeconds * 1000;
    }

    public showInterstitialIfAllowed(onClose?: () => void): void {
        if (!this.canShowInterstitial()) {
            return;
        }

        this.lastInterstitialTimestamp = Date.now();
        this.yandexService.showInterstitial(onClose);
    }

    /**
     * Показывает reward-рекламу за бонусные монеты.
     * Результат (была ли награда выдана) приходит в колбэк onCompleted.
     */
    public showRewardForCoins(onCompleted: (granted: boolean) => void): void {
        if (!this.yandexService.isAvailable() || this.settingsManager.getSettings().adsDisabled) {
            onCompleted(false);
            return;
        }

        this.yandexService.showRewarded(
            () => {
                void this.grantReward();
                onCompleted(true);
            },
            () => onCompleted(false),
        );
    }

    private async grantReward(): Promise<void> {
        await this.progressionManager.addCoins(YandexConfig.rewardBonusCoins);
    }
}