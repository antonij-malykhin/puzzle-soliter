import { log } from 'cc';
import { L10NManager } from '../../../../extensions/Yandex Games SDK/static/assets/core/l10n';
import { YandexService } from '../../Services/YandexService';
import { ILocalizationProvider, LocalizationParams } from './ILocalizationProvider';

export class YandexLocalizationProvider implements ILocalizationProvider {
    private currentLanguage: string;
    private readonly yandexL10n: L10NManager = L10NManager.instance;

    public constructor(
        private readonly yandexService: YandexService,
        private readonly fallbackProvider: ILocalizationProvider,
        private readonly defaultDebugLanguage: string
    ) {
        let sdkLanguage = this.yandexService.getEnvironmentLanguage();
        if (this.defaultDebugLanguage.length > 0) {
            sdkLanguage = this.defaultDebugLanguage;
            log(`Overriding SDK language with default debug language: ${this.defaultDebugLanguage}`);
        }
        
        this.currentLanguage = sdkLanguage;
        this.fallbackProvider.setLanguage(sdkLanguage);
        this.applyYandexLanguage(sdkLanguage);
        log(`Initialized YandexLocalizationProvider with language: ${sdkLanguage}`);
    }

    public setLanguage(language: string): void {
        this.currentLanguage = language;
        this.fallbackProvider.setLanguage(language);
        this.applyYandexLanguage(language);
        log(`Set language to: ${language}`);
    }

    public getLanguage(): string {
        return this.currentLanguage;
    }

    public t(key: string, params?: LocalizationParams): string {
        this.syncLanguageWithYandexEnvironment();

        const yandexValue = this.translateWithYandex(key);
        if (this.hasYandexTranslation(key, yandexValue)) {
            log(`Using Yandex translation for key: ${key}, value: ${yandexValue}`);
            return this.applyParams(yandexValue, params);
        }

        log(`Falling back to default translation for key: ${key}`);
        return this.fallbackProvider.t(key, params);
    }

    private syncLanguageWithYandexEnvironment(): void {
        if (!this.yandexService.isAvailable()) {
            return;
        }

        const sdkLanguage = this.yandexService.getEnvironmentLanguage();
        if (sdkLanguage === this.currentLanguage) {
            return;
        }

        this.currentLanguage = sdkLanguage;
        this.fallbackProvider.setLanguage(sdkLanguage);
        this.applyYandexLanguage(sdkLanguage);
    }

    private applyYandexLanguage(language: string): void {
        if (!this.yandexL10n.isInitialized()) {
            return;
        }

        void this.yandexL10n.changeLanguage(language as never);
    }

    private translateWithYandex(key: string): string {
        if (!this.yandexL10n.isInitialized()) {
            return key;
        }

        try {
            return this.yandexL10n.t(key);
        } catch {
            return key;
        }
    }

    private hasYandexTranslation(key: string, value: string): boolean {
        if (value.length === 0) {
            return false;
        }

        return value !== key;
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
