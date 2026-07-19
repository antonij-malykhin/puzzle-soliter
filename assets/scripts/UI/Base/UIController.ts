import { EventBus } from '../../Core/Events/EventBus';
import { GameEventMap } from '../../Core/Events/GameEventMap';
import { UIView } from './UIView';

export abstract class UIController<TView extends UIView> {
    private readonly disposables: Array<() => void> = [];

    public constructor(
        protected readonly eventBus: EventBus<GameEventMap>,
        protected readonly view: TView,
    ) {}

    public bind(): void {
        this.onBind();
    }

    public dispose(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;
    }

    protected subscribe<TKey extends keyof GameEventMap>(
        eventName: TKey,
        handler: (payload: GameEventMap[TKey]) => void,
    ): void {
        const dispose = this.eventBus.on(eventName, handler);
        this.disposables.push(dispose);
    }

    protected abstract onBind(): void;
}
