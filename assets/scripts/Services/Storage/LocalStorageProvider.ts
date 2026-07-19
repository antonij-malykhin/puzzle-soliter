import { IStorageProvider } from '../../Data/Interfaces/IStorageProvider';

export class LocalStorageProvider implements IStorageProvider {
    private readonly memoryFallback = new Map<string, string>();

    public async getItem<TValue>(key: string): Promise<TValue | null> {
        const rawValue = this.readRaw(key);
        if (!rawValue) {
            return null;
        }

        return JSON.parse(rawValue) as TValue;
    }

    public async setItem<TValue>(key: string, value: TValue): Promise<void> {
        const rawValue = JSON.stringify(value);
        this.writeRaw(key, rawValue);
    }

    public async removeItem(key: string): Promise<void> {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
            return;
        }

        this.memoryFallback.delete(key);
    }

    private readRaw(key: string): string | null {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(key);
        }

        return this.memoryFallback.get(key) ?? null;
    }

    private writeRaw(key: string, value: string): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
            return;
        }

        this.memoryFallback.set(key, value);
    }
}
