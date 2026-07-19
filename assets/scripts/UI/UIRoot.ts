import { _decorator, Component, Node } from 'cc';
import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { GameState } from '../Core/Enums/GameState';
import { MainMenuUI } from './Screens/MainMenuUI';
import { GameUI } from './Screens/GameUI';
import { PauseUI } from './Screens/PauseUI';
import { SettingsUI } from './Screens/SettingsUI';
import { VictoryUI } from './Screens/VictoryUI';

const { ccclass, property } = _decorator;

@ccclass('UIRoot')
export class UIRoot extends Component {
    @property(MainMenuUI)
    private mainMenu: MainMenuUI | null = null;

    @property(GameUI)
    private gameUI: GameUI | null = null;

    @property(PauseUI)
    private pauseUI: PauseUI | null = null;

    @property(SettingsUI)
    private settingsUI: SettingsUI | null = null;

    @property(VictoryUI)
    private victoryUI: VictoryUI | null = null;

    private disposables: Array<() => void> = [];

    public async initialize(eventBus: EventBus<GameEventMap>): Promise<void> {
        this.dispose();
        this.ensureScreenNodes();

        this.disposables.push(eventBus.on('GameStarted', async ({ levelId }) => {
            this.gameUI?.setLevel(levelId);
            await this.mainMenu?.hide();
            await this.victoryUI?.hide();
            await this.pauseUI?.hide();
            await this.gameUI?.show();
        }));

        this.disposables.push(eventBus.on('GameStateChanged', async ({ current }) => {
            if (current === GameState.Paused) {
                await this.pauseUI?.show();
                return;
            }

            if (current === GameState.Playing) {
                await this.pauseUI?.hide();
            }
        }));

        this.disposables.push(eventBus.on('SettingsChanged', ({ settings }) => {
            this.settingsUI?.setSettings(settings);
        }));

        this.disposables.push(eventBus.on('PiecePlaced', ({ lockedPieces, totalPieces }) => {
            this.gameUI?.setProgress(lockedPieces, totalPieces);
        }));

        this.disposables.push(eventBus.on('PuzzleCompleted', async ({ levelId, elapsedSeconds }) => {
            this.victoryUI?.setResult(levelId, elapsedSeconds);
            await this.victoryUI?.show();
        }));

        await this.gameUI?.hide();
        await this.pauseUI?.hide();
        await this.victoryUI?.hide();
        await this.mainMenu?.show();
    }

    public dispose(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;
    }

    protected onDestroy(): void {
        this.dispose();
    }

    private ensureScreenNodes(): void {
        this.mainMenu = this.mainMenu ?? this.createScreen('MainMenu', MainMenuUI);
        this.gameUI = this.gameUI ?? this.createScreen('GameUI', GameUI);
        this.pauseUI = this.pauseUI ?? this.createScreen('PauseUI', PauseUI);
        this.settingsUI = this.settingsUI ?? this.createScreen('SettingsUI', SettingsUI);
        this.victoryUI = this.victoryUI ?? this.createScreen('VictoryUI', VictoryUI);
    }

    private createScreen<TComponent extends Component>(
        name: string,
        constructor: new () => TComponent,
    ): TComponent {
        const node = new Node(name);
        node.setParent(this.node);
        return node.addComponent(constructor);
    }
}
