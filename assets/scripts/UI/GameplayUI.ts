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

    public async initialize(
        eventBus: EventBus<GameEventMap>,
        options: {
            onVictoryNextRequested: () => void;
            onVictoryRestartRequested: () => void;
        },
    ): Promise<void> {
        
        this.victoryUI.setNextHandler(options.onVictoryNextRequested);
        this.victoryUI.setRestartHandler(options.onVictoryRestartRequested);

        this.disposables.push(eventBus.on('GameStarted', async ({ levelId }) => {
            this.gameUI?.setLevel(levelId);
            await this.victoryUI.hide();
            await this.pauseUI.hide();
            await this.gameUI.show();
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

        this.disposables.push(eventBus.on('PiecePlaced', ({ lockedPieces, totalPieces }) => {
            this.gameUI.setProgress(lockedPieces, totalPieces);
        }));

        this.disposables.push(eventBus.on('PuzzleCompleted', async ({ levelId, elapsedSeconds }) => {
            this.victoryUI.setResult(levelId, elapsedSeconds);
            await this.victoryUI.show();
        }));

        await this.gameUI.hide();
        await this.pauseUI.hide();
        await this.victoryUI.hide();
    }

    protected onDestroy(): void {
        this.dispose();
    }

    private dispose(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;
    }
}