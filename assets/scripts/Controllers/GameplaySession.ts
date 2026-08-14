import { UITransform } from 'cc';
import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { ServiceContainer } from '../Core/ServiceContainer';
import { InputManager } from '../Input/InputManager';
import { ImageService } from '../Services/ImageService';
import { LevelService } from '../Services/LevelService';
import { SpriteFrameSliceService } from '../Services/SpriteFrameSliceService';
import { GameManager } from '../Managers/GameManager';
import { ProgressionManager } from '../Managers/ProgressionManager';
import { PuzzleManager } from '../Managers/PuzzleManager';
import { SceneManager } from '../Managers/SceneManager';
import { SuggestionManager } from '../Managers/SuggestionManager';
import { YandexAdManager } from '../Managers/YandexAdManager';
import { AudioManager } from '../Managers/AudioManager';
import { LocalizationManager } from '../Managers/LocalizationManager';
import { LevelData } from '../Data/Models/LevelData';
import { GameplayController } from './GameplayController';
import { GameplayUI } from '../UI/GameplayUI';
import { PuzzleStage } from '../UI/Puzzle/PuzzleStage';
import { PerformanceMonitor } from '../Utils/PerformanceMonitor';

export interface GameplaySessionServices {
    readonly eventBus: EventBus<GameEventMap>;
    readonly imageService: ImageService;
    readonly levelService: LevelService;
    readonly gameManager: GameManager;
    readonly puzzleManager: PuzzleManager;
    readonly inputManager: InputManager;
    readonly sceneManager: SceneManager;
    readonly progressionManager: ProgressionManager;
    readonly suggestionManager: SuggestionManager;
    readonly yandexAdManager: YandexAdManager;
    readonly spriteFrameSliceService: SpriteFrameSliceService;
}

export interface GameplaySessionScene {
    readonly puzzleStage: PuzzleStage | null;
    readonly gameplayUI: GameplayUI | null;
    readonly boardUITransform: UITransform | null;
}

export class GameplaySession {
    private settingsSubscription: (() => void) | null = null;
    private gameplayController: GameplayController | null = null;
    private levelData!: LevelData;

    public constructor(
        private readonly services: GameplaySessionServices,
        private readonly scene: GameplaySessionScene,
    ) {}

    public async start(): Promise<void> {
        PerformanceMonitor.clear();
        PerformanceMonitor.setEnabled(true);
        PerformanceMonitor.mark('game-start');

        await this.loadLevel();
        this.subscribeSettings();

        this.services.puzzleManager.initializeLevel(this.levelData);
        this.scene.puzzleStage?.initialize(
            this.services.puzzleManager,
            this.services.inputManager,
            this.services.eventBus,
            this.services.imageService,
            this.services.spriteFrameSliceService,
        );

        await this.services.imageService.getImageById(this.levelData.imageId).catch(() => {
            // Placeholder content may be absent at early MVP stages.
        });

        this.gameplayController = new GameplayController();
        await this.gameplayController.initialize(
            this.services.eventBus,
            this.scene.gameplayUI!,
            this.services.gameManager,
            this.services.sceneManager,
            this.services.progressionManager,
            this.services.suggestionManager,
            this.services.yandexAdManager,
            this.services.progressionManager.getCurrentLevelId(),
        );

        this.services.eventBus.emit('LevelLoaded', {
            levelId: this.levelData.id,
            gridColumnCount: this.levelData.gridColumnCount,
            gridRowCount: this.levelData.gridRowCount,
            gridCellWidth: this.levelData.gridCellWidth,
            gridCellHeight: this.levelData.gridCellHeight,
        });

        PerformanceMonitor.measure('game-init', 'game-start');
        PerformanceMonitor.reportMemory();
        await this.gameplayController.startGameplay();
    }

    public dispose(): void {
        this.settingsSubscription?.();
        this.settingsSubscription = null;
        this.gameplayController?.dispose();
        this.gameplayController = null;
        this.scene.puzzleStage?.dispose();
        this.services.puzzleManager.dispose();
    }

    private async loadLevel(): Promise<void> {
        const levelId = this.services.progressionManager.getCurrentLevelId();
        this.levelData = await this.services.levelService.getLevel(levelId);

        const boardLayerSize = this.scene.boardUITransform!.contentSize;
        const boardOrigin = {
            x: this.scene.boardUITransform?.node.worldPosition.x ?? 0,
            y: this.scene.boardUITransform?.node.worldPosition.y ?? 0,
        };
        this.levelData.gridCellWidth = boardLayerSize.x / this.levelData.gridColumnCount;
        this.levelData.gridCellHeight = boardLayerSize.y / this.levelData.gridRowCount;
        this.services.inputManager.setupBoardConfiguration(this.levelData, boardOrigin);
    }

    private subscribeSettings(): void {
        this.settingsSubscription = this.services.eventBus.on('SettingsChanged', ({ settings }) => {
            ServiceContainer.get(AudioManager).applySettings(settings);
            ServiceContainer.get(LocalizationManager).setLanguage(settings.language);
        });
    }
}
