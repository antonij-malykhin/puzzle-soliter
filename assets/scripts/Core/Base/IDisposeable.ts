export interface IDisposeable {
    disposables: Array<() => void>;
    dispose(): void;
}

export class DisposeableBase implements IDisposeable {
    public disposables: Array<() => void> = [];

    public addDisposable(disposable: () => void): void {
        this.disposables.push(disposable);
    }
    
    public dispose(): void {
        this.disposables.forEach(dispose => dispose());
        this.disposables = [];
    }
}