export type LocalizationParams = Readonly<Record<string, string | number>>;

export interface ILocalizationProvider {
    setLanguage(language: string): void;
    getLanguage(): string;
    t(key: string, params?: LocalizationParams): string;
}
