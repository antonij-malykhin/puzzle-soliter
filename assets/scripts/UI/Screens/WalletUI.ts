import { _decorator, Component, Label } from 'cc';
import { EventBus } from '../../Core/Events/EventBus';
import { GameEventMap } from '../../Core/Events/GameEventMap';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { WalletManager } from '../../Managers/WalletManager';

const { ccclass, property } = _decorator;

@ccclass('WalletUI')
export class WalletUI extends Component {
    @property(Label)
    private valueLabel: Label | null = null;

    private disposables: Array<() => void> = [];

    public initialize(eventBus: EventBus<GameEventMap>): void {
        const wallet = ServiceContainer.get(WalletManager);
        this.setBalance(wallet.getBalance());

        const disposable = eventBus.on('WalletBalanceChanged', ({ newBalance }) => {
            this.setBalance(newBalance);
        });
        this.disposables.push(disposable);
    }

    private setBalance(value: number): void {
        if (!this.valueLabel) {
            return;
        }

        this.valueLabel.string = `${value}`;
    }

    protected onDestroy(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;
    }
}
