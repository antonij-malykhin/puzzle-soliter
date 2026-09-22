import { _decorator, Component, Label } from 'cc';
import { EventBus } from '../../Core/Events/EventBus';
import { GameEventMap } from '../../Core/Events/GameEventMap';

const { ccclass, property } = _decorator;

@ccclass('SuggestionUI')
export class SuggestionUI extends Component {
    @property(Label)
    private suggestionCountLabel: Label | null = null;

    private disposables: Array<() => void> = [];

    public setSuggestionCount(count: number): void {
        this.suggestionCountLabel!.string = `${count}`;
    }

    public initialize(eventBus: EventBus<GameEventMap>, suggestionCount: number): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;

        this.setSuggestionCount(suggestionCount);
        this.disposables.push(
            eventBus.on('SuggestionCountChanged', ({ newCount }) => {
                this.setSuggestionCount(newCount);
            }),
        );
        this.disposables.push(
            eventBus.on('SuggestionProvided', ({ newCount }) => {
                this.setSuggestionCount(newCount);
            }),
        );
    }

    protected onDestroy(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;
    }
}
