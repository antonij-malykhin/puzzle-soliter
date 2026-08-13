import { _decorator, Component } from 'cc';
import { VictoryUI } from './Screens/VictoryUI';
import { GameUI } from './Screens/GameUI';
import { PauseUI } from './Screens/PauseUI';
import { SettingsUI } from './Screens/SettingsUI';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { EventBus } from '../Core/Events/EventBus';
import { GameState } from '../Core/Enums/GameState';

const { ccclass, property } = _decorator;
@ccclass('GameplayUI')
export class GameplayUI extends Component {
    @property(GameUI)
    private gameUI!: GameUI;

    @property(VictoryUI)
    private victoryUI!: VictoryUI;

    private disposables: Array<() => void> = [];

    protected onLoad(): void {
        this.gameUI.hide();
        this.victoryUI.hide();
    }

    public async initialize(
        eventBus: EventBus<GameEventMap>,
        options: {
            onVictoryNextRequested: () => void;
            onBackToLobbyRequested: () => void;
            onSuggestionRequested: () => void;
        },
    ): Promise<void> {
        this.victoryUI.setNextHandler(options.onVictoryNextRequested);

        this.disposables.push(eventBus.on('GameStarted', ({ levelId }) => {
            this.gameUI?.initialize(levelId, eventBus, options.onBackToLobbyRequested, options.onSuggestionRequested);
            this.victoryUI.hide();
            this.gameUI.show();
        }));

        this.disposables.push(eventBus.on('PuzzleCompleted', async ({ levelId, levelNumber: elapsedSeconds }) => {
            await this.victoryUI.show();
        }));
    }

    protected onDestroy(): void {
        this.dispose();
    }

    private dispose(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;
    }
}