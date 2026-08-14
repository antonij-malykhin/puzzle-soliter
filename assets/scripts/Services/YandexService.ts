import type { YandexGames } from 'ysdk';

export interface LeaderboardResult {
    entries: ReadonlyArray<YandexGames.LeaderboardEntry>;
    userRank: number | null;
}

/**
 * Удобный фасад поверх Yandex Games SDK.
 * В окружениях без SDK (TypeEditor/обычный предпросмотр) сервис безопасно
 * ничего не делает и возвращает значения по умолчанию, чтобы игра работала.
 */
export class YandexService {
    private sdk: YandexGames.SDK | null = null;

    public async initialize(): Promise<void> {
        // 1. Проверяем, не инициализирован ли SDK повторно
        if (this.sdk !== null) {
            console.log('[YandexService] SDK is already initialized.');
            return;
        }

        // 2. Проверяем доступность скрипта YaGames
        if (typeof YaGames === 'undefined') {
            console.warn('[YandexService] YaGames script is not loaded or blocked.');
            return;
        }

        // 3. Безопасный вызов инициализации
        try {
            this.sdk = await YaGames.init();
            console.log('[YandexService] Yandex SDK successfully initialized!', this.sdk);
        } catch (error) {
            console.warn('[YandexService] Failed to initialize Yandex SDK:', error);
            this.sdk = null;
        }
    }

    public isAvailable(): boolean {
        return this.sdk !== null;
    }

    /** Сигнал о готовности игры к показу (LoadingAPI.ready). */
    public signalReady(): void {
        if (!this.isAvailable()) {
            return;
        }

        this.getSDK().features.LoadingAPI.ready();
    }

    // ---------------------------------------------------------------- Реклама

    public showInterstitial(onClose?: () => void): void {
        if (!this.isAvailable()) {
            return;
        }

        this.getSDK().adv.showFullscreenAdv({
            callbacks: {
                onClose: () => onClose?.(),
            },
        });
    }

    public showRewarded(onRewarded: () => void, onError?: () => void): void {
        if (!this.isAvailable()) {
            return;
        }

        this.getSDK().adv.showRewardedVideo({
            callbacks: {
                onRewarded,
                onError: () => onError?.(),
            },
        });
    }

    // ------------------------------------------------------- Облачные данные

    public async getPlayer(): Promise<YandexGames.Player | null> {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            return await this.getSDK().getPlayer();
        } catch (error) {
            console.warn('[YandexService] Unable to get player.', error);
            return null;
        }
    }

    public async loadCloudData<TData extends object>(keys: Array<keyof TData>): Promise<Partial<TData>> {
        if (!this.isAvailable()) {
            return {};
        }

        try {
            const player = await this.getSDK().getPlayer();
            return await player.getData<TData>(keys);
        } catch (error) {
            console.warn('[YandexService] Unable to load cloud data.', error);
            return {};
        }
    }

    public async saveCloudData<TData extends object>(data: Partial<TData>): Promise<void> {
        if (!this.isAvailable()) {
            return;
        }

        try {
            const player = await this.getSDK().getPlayer();
            await player.setData<TData>(data);
        } catch (error) {
            console.warn('[YandexService] Unable to save cloud data.', error);
        }
    }

    // ------------------------------------------------------------ Лидерборд

    public async setLeaderboardScore(name: string, score: number, extraData?: string): Promise<void> {
        if (!this.isAvailable()) {
            return;
        }

        try {
            const leaderboards = await this.getSDK().getLeaderboards();
            await leaderboards.setLeaderboardScore(name, score, extraData);
        } catch (error) {
            console.warn('[YandexService] Unable to set leaderboard score.', error);
        }
    }

    public async getLeaderboard(name: string): Promise<LeaderboardResult> {
        if (!this.isAvailable()) {
            return { entries: [], userRank: null };
        }

        try {
            const leaderboards = await this.getSDK().getLeaderboards();
            const result = await leaderboards.getLeaderboardEntries(name, {
                includeUser: true,
                quantityAround: 3,
                quantityTop: 3,
            });
            return { entries: result.entries, userRank: result.userRank ?? null };
        } catch (error) {
            console.warn('[YandexService] Unable to get leaderboard.', error);
            return { entries: [], userRank: null };
        }
    }

    // ------------------------------------------------------------------- IAP

    public async getCatalog(): Promise<ReadonlyArray<YandexGames.Product>> {
        const payments = await this.getPayments();
        if (!payments) {
            return [];
        }

        try {
            return await payments.getCatalog();
        } catch (error) {
            console.warn('[YandexService] Unable to get product catalog.', error);
            return [];
        }
    }

    public async getPurchases(): Promise<ReadonlyArray<YandexGames.Purchase>> {
        const payments = await this.getPayments();
        if (!payments) {
            return [];
        }

        try {
            return await payments.getPurchases();
        } catch (error) {
            console.warn('[YandexService] Unable to get purchases.', error);
            return [];
        }
    }

    public async purchase(productId: string): Promise<YandexGames.Purchase | null> {
        const payments = await this.getPayments();
        if (!payments) {
            return null;
        }

        try {
            return await payments.purchase({ id: productId });
        } catch (error) {
            console.warn('[YandexService] Purchase cancelled or failed.', error);
            return null;
        }
    }

    public async consumePurchase(token: string): Promise<void> {
        const payments = await this.getPayments();
        if (!payments) {
            return;
        }

        try {
            await payments.consumePurchase(token);
        } catch (error) {
            console.warn('[YandexService] Unable to consume purchase.', error);
        }
    }

    private getPayments(): Promise<YandexGames.Payments | null> {
        if (!this.isAvailable()) {
            return Promise.resolve(null);
        }

        return this.getSDK().getPayments().catch((error) => {
            console.warn('[YandexService] Unable to get payments.', error);
            return null;
        });
    }

    private getSDK(): YandexGames.SDK {
        if (this.sdk === null) {
            throw new Error('Yandex SDK is not available.');
        }

        return this.sdk;
    }
}