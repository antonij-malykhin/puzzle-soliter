import { YandexService } from '../Services/YandexService';
import { ILocalizationProvider, LocalizationParams } from './Localization/ILocalizationProvider';
import { LocalLocalizationProvider } from './Localization/LocalLocalizationProvider';
import { YandexLocalizationProvider } from './Localization/YandexLocalizationProvider';

export class LocalizationManager {
    private readonly activeProvider: ILocalizationProvider;

    public constructor(yandexService: YandexService, defaultLanguage: string) {
        const localProvider = new LocalLocalizationProvider(defaultLanguage);
        this.activeProvider = new YandexLocalizationProvider(yandexService, localProvider, defaultLanguage);
    }

    public setLanguage(language: string): void {
        this.activeProvider.setLanguage(language);
    }

    public getLanguage(): string {
        return this.activeProvider.getLanguage();
    }

    public t(key: string, params?: LocalizationParams): string {
        return this.activeProvider.t(key, params);
    }
}
