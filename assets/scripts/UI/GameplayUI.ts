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

    @property(PauseUI)
    private pauseUI!: PauseUI;

    @property(SettingsUI)
    private settingsUI!: SettingsUI;

    @property(VictoryUI)
    private victoryUI!: VictoryUI;

    private disposables: Array<() => void> = [];

    protected onLoad(): void {
        this.gameUI.hide();
        this.pauseUI.hide();
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
            this.pauseUI.hide();
            this.gameUI.show();
        }));

        this.disposables.push(eventBus.on('GameStateChanged', async ({ current }) => {
            if (current === GameState.Paused) {
                await this.pauseUI.show();
                return;
            }

            if (current === GameState.Playing) {
                await this.pauseUI.hide();
            }
        }));

        this.disposables.push(eventBus.on('SettingsChanged', ({ settings }) => {
            this.settingsUI.setSettings(settings);
        }));

        this.disposables.push(eventBus.on('PuzzleCompleted', async ({ levelId, elapsedSeconds }) => {
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