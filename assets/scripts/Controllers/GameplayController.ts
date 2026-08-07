import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { ServiceContainer } from '../Core/ServiceContainer';
import { GameManager } from '../Managers/GameManager';
import { ProgressionManager } from '../Managers/ProgressionManager';
import { SceneManager } from '../Managers/SceneManager';
import { GameplayUI } from '../UI/GameplayUI';
import { SuggestionManager } from '../Managers/SuggestionManager';
import { YandexAdManager } from '../Managers/YandexAdManager';
import { YandexService } from '../Services/YandexService';
import { YandexConfig } from '../Core/Config/YandexConfig';
import { GameState } from '../Core/Enums/GameState';

export class GameplayController {
    private sceneManager!: SceneManager;
    private gameManager!: GameManager;
    private suggestionManager!: SuggestionManager;
    private yandexAdManager!: YandexAdManager;
    private eventBus!: EventBus<GameEventMap>;
    private completionSubscription!: () => void;
    private progressionManager: ProgressionManager | null = null;
    private currentLevelId!: string;
    private pendingProgressSave: Promise<void> = Promise.resolve();
    private gameplayUI!: GameplayUI;
    private interstitialTimer: ReturnType<typeof setInterval> | null = null;
    private accumulatedPlaySeconds = 0;

    public async initialize(
        eventBus: EventBus<GameEventMap>,
        gameplayUI: GameplayUI,
        gameManager: GameManager,
        sceneManager: SceneManager,
        progressionManager: ProgressionManager,
        suggestionManager: SuggestionManager,
        yandexAdManager: YandexAdManager,
        activeLevelId: string
    ): Promise<void> {
        this.eventBus = eventBus;
        this.gameManager = gameManager;
        this.sceneManager = sceneManager;
        this.currentLevelId = activeLevelId;
        this.gameplayUI = gameplayUI;
        this.progressionManager = progressionManager;
        this.suggestionManager = suggestionManager;
        this.yandexAdManager = yandexAdManager;
        this.gameplayUI.initialize(eventBus, {
            onVictoryNextRequested: async () => {
                await this.openLobbyScene();
            },
            onBackToLobbyRequested: async () => {
                await this.sceneManager!.loadLobbyScene();
            },
            onSuggestionRequested: async () => {
                await this.suggestionManager!.provideSuggestion();
            }
        });
        this.completionSubscription = this.eventBus!.on('PuzzleCompleted', async ({ levelId, elapsedSeconds }) => {
            this.pendingProgressSave = this.progressionManager!
                .markLevelCompleted(levelId, elapsedSeconds)
                .then(() => ServiceContainer.get(YandexService)
                    .setLeaderboardScore(YandexConfig.leaderboards.bestTime, elapsedSeconds));
        });
    }

    public async startGameplay(): Promise<void> {
        this.gameManager.startLevel(this.currentLevelId);
        this.startInterstitialTimer();
    }

    public async openLobbyScene(): Promise<void> {
        await this.pendingProgressSave;
        await this.sceneManager!.loadLobbyScene();
    }

    public dispose() {
        this.stopInterstitialTimer();
        this.completionSubscription?.();
    }

    private startInterstitialTimer(): void {
        if (this.interstitialTimer !== null) {
            return;
        }

        this.accumulatedPlaySeconds = 0;
        this.interstitialTimer = setInterval(() => {
            if (this.gameManager.getState() !== GameState.Playing) {
                return;
            }

            this.accumulatedPlaySeconds += 1;
            if (this.accumulatedPlaySeconds >= YandexConfig.interstitialMinIntervalSeconds) {
                this.accumulatedPlaySeconds = 0;
                this.yandexAdManager.showInterstitialIfAllowed();
            }
        }, 1000);
    }

    private stopInterstitialTimer(): void {
        if (this.interstitialTimer === null) {
            return;
        }

        clearInterval(this.interstitialTimer);
        this.interstitialTimer = null;
    }
}