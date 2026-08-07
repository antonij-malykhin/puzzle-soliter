export interface YandexCoinPackConfig {
    readonly productId: string;
    readonly coins: number;
}

/**
 * Единая точка настройки интеграции с Yandex Games.
 * При занесении реальных значений в консоль Yandex достаточно изменить поля здесь,
 * без правки бизнес-логики.
 */
export const YandexConfig = {
    /** Минимальный интервал между показами interstitial-рекламы (в секундах). */
    interstitialMinIntervalSeconds: 300,

    /** Количество монет, выдаваемое за просмотр reward-рекламы. */
    rewardBonusCoins: 100,

    /** Идентификатор непотребляемого продукта «Отключение рекламы». */
    removeAdsProductId: 'remove_ads',

    /** Паки покупки валюты. */
    coinPacks: [
        { productId: 'coin_pack_small', coins: 500 },
        { productId: 'coin_pack_medium', coins: 1500 },
        { productId: 'coin_pack_large', coins: 5000 },
    ] as ReadonlyArray<YandexCoinPackConfig>,

    /** Идентификаторы лидербордов. */
    leaderboards: {
        bestTime: 'leaderboard_best_time',
    },
} as const;