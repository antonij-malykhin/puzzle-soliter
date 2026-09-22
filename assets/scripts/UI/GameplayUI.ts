import { _decorator, Component } from 'cc';
import { VictoryUI } from './Screens/VictoryUI';
import { GameUI } from './Screens/GameUI';
import { SuggestionShop } from './Screens/SuggestionShop';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { EventBus } from '../Core/Events/EventBus';

const { ccclass, property } = _decorator;
@ccclass('GameplayUI')
export class GameplayUI extends Component {
    @property(GameUI)
    private gameUI!: GameUI;

    @property(VictoryUI)
    private victoryUI!: VictoryUI;

    @property(SuggestionShop)
    private suggestionShop: SuggestionShop | null = null;

    private disposables: Array<() => void> = [];

    protected onLoad(): void {
        this.gameUI.hide();
        this.victoryUI.hide();
        if (!this.suggestionShop) {
            this.suggestionShop = this.node.parent?.getComponentInChildren(SuggestionShop) ?? null;
        }
        this.suggestionShop?.hide();
    }

    public async initialize(
        eventBus: EventBus<GameEventMap>,
        suggestionCount: number,
        options: {
            onVictoryNextRequested: () => void;
            onBackToLobbyRequested: () => void;
            onSuggestionRequested: () => void;
            onBuySuggestionRequested?: () => Promise<boolean>;
            suggestionPrice?: number;
            currentCoins?: number;
        },
    ): Promise<void> {
        this.victoryUI.setNextHandler(options.onVictoryNextRequested);

        if (!this.suggestionShop) {
            this.suggestionShop = this.node.parent?.getComponentInChildren(SuggestionShop) ?? null;
        }

        if (this.suggestionShop && options.onBuySuggestionRequested) {
            this.suggestionShop.initialize(
                eventBus,
                options.suggestionPrice ?? 0,
                options.currentCoins ?? 0,
                options.onBuySuggestionRequested,
            );
        }

        this.disposables.push(eventBus.on('GameStarted', ({ levelNumber: levelNumber }) => {
            this.gameUI?.initialize(levelNumber, suggestionCount, eventBus, options.onBackToLobbyRequested, options.onSuggestionRequested);
            this.victoryUI.hide();
            this.suggestionShop?.hide();
            this.gameUI.show();
        }));

        this.disposables.push(eventBus.on('PuzzleCompleted', async ({ levelId, levelNumber }) => {
            this.suggestionShop?.hide();
            await this.victoryUI.show();
        }));
    }

    public async openSuggestionShop(): Promise<void> {
        await this.suggestionShop?.show();
    }

    public async closeSuggestionShop(): Promise<void> {
        await this.suggestionShop?.hide();
    }

    protected onDestroy(): void {
        this.dispose();
    }

    private dispose(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;
    }
}