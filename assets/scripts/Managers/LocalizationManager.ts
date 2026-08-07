export class LocalizationManager {
    private currentLanguage = 'en';

    private readonly strings: Record<string, Record<string, string>> = {
        en: {
            lobbyLevel: 'Level {number}',
            lobbyLevelNotSelected: 'Level: not selected',
            gameLevel: 'Level: {id}',
        },
        ru: {
            lobbyLevel: 'Уровень {number}',
            lobbyLevelNotSelected: 'Уровень: не выбран',
            gameLevel: 'Уровень: {id}',
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
