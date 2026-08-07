import { IStorageProvider } from '../../Data/Interfaces/IStorageProvider';
import { YandexService } from '../YandexService';
import { LocalStorageProvider } from './LocalStorageProvider';

/**
 * Хранит прогресс в облаке Yandex Games через player.getData/setData,
 * с фолбэком на локальное хранилище (когда SDK недоступен).
 */
export class CloudStorageProvider implements IStorageProvider {
    private readonly fallback: IStorageProvider;

    public constructor(
        private readonly yandexService: YandexService,
        fallback: IStorageProvider = new LocalStorageProvider(),
    ) {
        this.fallback = fallback;
    }

    public async getItem<TValue>(key: string): Promise<TValue | null> {
        const cloudValue = await this.readCloud(key);
        if (cloudValue !== null && cloudValue !== undefined) {
            await this.fallback.setItem(key, cloudValue);
            return cloudValue as TValue;
        }

        return this.fallback.getItem<TValue>(key);
    }

    public async setItem<TValue>(key: string, value: TValue): Promise<void> {
        await this.fallback.setItem(key, value);
        await this.writeCloud(key, value);
    }

    public async removeItem(key: string): Promise<void> {
        await this.fallback.removeItem(key);
        await this.writeCloud(key, null);
    }

    private async readCloud(key: string): Promise<unknown> {
        if (!this.yandexService.isAvailable()) {
            return null;
        }

        const data = await this.yandexService.loadCloudData<Record<string, unknown>>([key]);
        return data?.[key] ?? null;
    }

    private async writeCloud(key: string, value: unknown): Promise<void> {
        if (!this.yandexService.isAvailable()) {
            return;
        }

        await this.yandexService.saveCloudData<Record<string, unknown>>({ [key]: value });
    }
}