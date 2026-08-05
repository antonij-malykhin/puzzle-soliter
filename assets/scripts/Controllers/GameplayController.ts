import { _decorator } from 'cc';
import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { GameManager } from '../Managers/GameManager';
import { ProgressionManager } from '../Managers/ProgressionManager';
import { SceneManager } from '../Managers/SceneManager';
import { GameplayUI } from '../UI/GameplayUI';
import { SuggestionManager } from '../Managers/SuggestionManager';

export class GameplayController {
    private sceneManager!: SceneManager;
    private gameManager!: GameManager;
    private suggestionManager!: SuggestionManager;
    private eventBus!: EventBus<GameEventMap>;
    private completionSubscription!: () => void;
    private progressionManager: ProgressionManager | null = null;
    private currentLevelId!: string;
    private pendingProgressSave: Promise<void> = Promise.resolve();
    private gameplayUI!: GameplayUI;
    
    public async initialize(
        eventBus: EventBus<GameEventMap>,
        gameplayUI: GameplayUI,
        gameManager: GameManager,
        sceneManager: SceneManager,
        progressionManager: ProgressionManager,
        suggestionManager: SuggestionManager,
        activeLevelId: string
    ): Promise<void> {
        this.eventBus = eventBus;
        this.gameManager = gameManager;
        this.sceneManager = sceneManager;
        this.currentLevelId = activeLevelId;
        this.gameplayUI = gameplayUI;
        this.progressionManager = progressionManager;
        this.suggestionManager = suggestionManager;
        this.gameplayUI.initialize(eventBus, {
            onVictoryNextRequested: async () => {
                await this.openLobbyScene();
            },
            onBackToLobbyRequested: async () => {
                await this.sceneManager!.loadLobbyScene();
            },
            onSuggestionRequested: async () => {
                this.suggestionManager!.provideSuggestion();
            }
        });
        this.completionSubscription = this.eventBus!.on('PuzzleCompleted', async ({ levelId, elapsedSeconds }) => {
            this.pendingProgressSave = this.progressionManager!.markLevelCompleted(levelId, elapsedSeconds);
        });
    }
    
    public async startGameplay(): Promise<void> {
        this.gameManager.startLevel(this.currentLevelId);
    }

    public async openLobbyScene(): Promise<void> {
        await this.pendingProgressSave;
        await this.sceneManager!.loadLobbyScene();
    }
    
    public dispose() {
        this.completionSubscription?.();
    }
}