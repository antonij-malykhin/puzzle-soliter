export interface IStorageProvider {
    clear(): Promise<void>;
    getItem<TValue>(key: string): Promise<TValue | null>;
    setItem<TValue>(key: string, value: TValue): Promise<void>;
    removeItem(key: string): Promise<void>;
}
