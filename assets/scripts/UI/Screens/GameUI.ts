import { _decorator, Button, Label } from 'cc';
import { UIView } from '../Base/UIView';
import { SuggestionUI } from './SuggestionUI';
import { EventBus } from '../../Core/Events/EventBus';
import { GameEventMap } from '../../Core/Events/GameEventMap';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { LocalizationManager } from '../../Managers/LocalizationManager';

const { ccclass, property } = _decorator;

@ccclass('GameUI')
export class GameUI extends UIView {
    @property(SuggestionUI)
    private suggestionUI!: SuggestionUI;
    @property(Label)
    private levelLabel: Label | null = null;

    @property(Button)
    private backButton: Button | null = null;

    @property(Button)
    private suggestionButton: Button | null = null;

    private backHandler: (() => void) | null = null;
    private suggestionHandler: (() => void) | null = null;

    protected onLoad(): void {
        super.onLoad();
    }

    public initialize(levelId: string, eventBus: EventBus<GameEventMap>, onBackToLobbyRequested: () => void, onSuggestionRequested: () => void): void {
        this.setLevel(levelId);
        this.suggestionUI.initialize(eventBus);

        this.unbindButtons();
        this.backHandler = onBackToLobbyRequested;
        this.suggestionHandler = onSuggestionRequested;
        this.backButton!.node.on(Button.EventType.CLICK, this.backHandler);
        this.suggestionButton!.node.on(Button.EventType.CLICK, this.suggestionHandler);
    }

    public setLevel(levelId: string): void {
        if (this.levelLabel) {
            this.levelLabel.string = ServiceContainer.get(LocalizationManager).t('gameLevel', { id: levelId });
        }
    }

    protected onDestroy(): void {
        this.unbindButtons();
    }

    private unbindButtons(): void {
        if (this.backHandler && this.backButton?.node) {
            this.backButton?.node.off(Button.EventType.CLICK, this.backHandler);
            this.backHandler = null;
        }

        if (this.suggestionHandler && this.suggestionButton?.node) {
            this.suggestionButton?.node.off(Button.EventType.CLICK, this.suggestionHandler);
            this.suggestionHandler = null;
        }
    }
}
