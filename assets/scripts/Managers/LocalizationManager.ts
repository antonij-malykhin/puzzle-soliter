export class LocalizationManager {
    private currentLanguage = 'en';

    private readonly strings: Record<string, Record<string, string>> = {
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
        },
    };

    public setLanguage(language: string): void {
        this.currentLanguage = language;
    }

    public getLanguage(): string {
        return this.currentLanguage;
    }

    public t(key: string, params?: Record<string, string | number>): string {
        const dictionary = this.strings[this.currentLanguage] ?? this.strings.en;
        let result = dictionary[key] ?? key;

        Object.keys(params ?? {}).forEach((name) => {
            const value = (params as Record<string, string | number>)[name];
            result = result.replace(`{${name}}`, String(value));
        });

        return result;
    }
}
