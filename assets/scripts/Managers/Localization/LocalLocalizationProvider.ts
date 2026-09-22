import { ILocalizationProvider, LocalizationParams } from './ILocalizationProvider';

type LocalizationDictionary = Readonly<Record<string, Readonly<Record<string, string>>>>;

const DEFAULT_STRINGS: LocalizationDictionary = {
    en: {
        loading: 'Loading...',
        loadingLobby: 'Loading lobby...',
        loadingLevel: 'Loading level...',
        loadingCollection: 'Loading collection...',
        loadingLeaderboard: 'Loading leaderboard...',
        lobbyLevel: 'Level {number}',
        lobbyLevelNotSelected: 'Level: not selected',
        gameLevel: 'Level: {number}',
        collectionRegionLabel: 'Bonus',
        collectionScreenTitle: 'Collection',
        leaderboardTitle: 'Leaderboard',
        settingsTitle: 'Settings',
        musicTitle: 'Music',
        soundTitle: 'Sound',
        playTitle: 'Play',
        previousRegionTitle: 'Previous region',
        nextRegionTitle: 'Next region',
        continueTitle: 'Continue',
        regionNumber: 'Region: {number}',
        buy: 'Buy',
        youHave: 'You have',
        suggestionShop: 'Suggestion shop',
    },
    ru: {
        loading: 'Загрузка...',
        loadingLobby: 'Загрузка лобби...',
        loadingLevel: 'Загрузка уровня...',
        loadingCollection: 'Загрузка коллекции...',
        loadingLeaderboard: 'Загрузка таблицы лидеров...',
        lobbyLevel: 'Уровень {number}',
        lobbyLevelNotSelected: 'Уровень: не выбран',
        gameLevel: 'Уровень: {number}',
        collectionRegionLabel: 'Бонус',
        collectionScreenTitle: 'Коллекция',
        leaderboardTitle: 'Таблица лидеров',
        settingsTitle: 'Настройки',
        musicTitle: 'Музыка',
        soundTitle: 'Звуки',
        playTitle: 'Играть',
        previousRegionTitle: 'Предыдущий регион',
        nextRegionTitle: 'Следующий регион',
        continueTitle: 'Продолжить',
        regionNumber: 'Регион: {number}',
        buy: 'Купить',
        youHave: 'У вас есть',
        suggestionShop: 'Магазин подсказок',
    },
};

export class LocalLocalizationProvider implements ILocalizationProvider {
    private currentLanguage: string;
    private readonly defaultLanguage: string;

    public constructor(
        defaultLanguage: string,
        private readonly dictionary: LocalizationDictionary = DEFAULT_STRINGS,
    ) {
        this.currentLanguage = defaultLanguage;
        this.defaultLanguage = defaultLanguage;
    }

    public setLanguage(language: string): void {
        this.currentLanguage = language;
    }

    public getLanguage(): string {
        return this.currentLanguage;
    }

    public t(key: string, params?: LocalizationParams): string {
        const languageDictionary = this.dictionary[this.currentLanguage] ?? this.dictionary[this.defaultLanguage];
        const rawText = languageDictionary[key] ?? key;

        return this.applyParams(rawText, params);
    }

    private applyParams(text: string, params?: LocalizationParams): string {
        let result = text;

        Object.keys(params ?? {}).forEach((name) => {
            const value = params?.[name];
            result = result.replace(`{${name}}`, String(value));
        });

        return result;
    }
}
