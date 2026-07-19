export class LocalizationManager {
    private currentLanguage = 'en';

    public setLanguage(language: string): void {
        this.currentLanguage = language;
    }

    public getLanguage(): string {
        return this.currentLanguage;
    }

    public t(localizationKey: string): string {
        return localizationKey;
    }
}
