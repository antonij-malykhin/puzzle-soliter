import { _decorator, Button, Label } from 'cc';
import { UIView } from '../Base/UIView';
import { SuggestionUI } from './SuggestionUI';
import { EventBus } from '../../Core/Events/EventBus';
import { GameEventMap } from '../../Core/Events/GameEventMap';

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
    
    protected onLoad(): void {
        super.onLoad();
    }
    
    public initialize(levelId: string, eventBus: EventBus<GameEventMap>, onBackToLobbyRequested: () => void, onSuggestionRequested: () => void): void {
        this.setLevel(levelId);
        this.suggestionUI.initialize(eventBus);
        this.backButton!.node.on(Button.EventType.CLICK, onBackToLobbyRequested);
        this.suggestionButton!.node.on(Button.EventType.CLICK, onSuggestionRequested);
    }

    public setLevel(levelId: string): void {
        if (this.levelLabel) {
            this.levelLabel.string = `Level: ${levelId}`;
        }
    }
}
