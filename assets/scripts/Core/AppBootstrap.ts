import { EventBus } from './Events/EventBus';
import { GameEventMap } from './Events/GameEventMap';
import { AudioManager } from '../Managers/AudioManager';
import { GameManager } from '../Managers/GameManager';
import { LocalizationManager } from '../Managers/LocalizationManager';
import { SaveManager } from '../Managers/SaveManager';
import { SceneManager } from '../Managers/SceneManager';
import { SettingsManager } from '../Managers/SettingsManager';
import { LocalStorageProvider } from '../Services/Storage/LocalStorageProvider';
import { LevelService } from '../Services/LevelService';
import { ResourcesLevelProvider } from '../Services/Content/ResourcesLevelProvider';
import { ImageService } from '../Services/ImageService';
import { ResourcesImageLoader } from '../Services/Content/ResourcesImageLoader';
import { PuzzleManager } from '../Managers/PuzzleManager';
import { PuzzleGenerator } from '../Generation/PuzzleGenerator';
import { BacktrackingGenerationStrategy } from '../Generation/BacktrackingGenerationStrategy';
import { PuzzleValidator } from '../Validation/PuzzleValidator';
import { SnapSystem } from '../Validation/SnapSystem';
import { InputManager } from '../Input/InputManager';
import { DragSystem } from '../Input/DragSystem';
import { RotationSystem } from '../Input/RotationSystem';
import {
    DEFAULT_BOARD_ORIGIN_WORLD_X,
    DEFAULT_BOARD_ORIGIN_WORLD_Y,
} from './Config/GameConstants';

export class AppBootstrap {
    private readonly eventBus = new EventBus<GameEventMap>();
    private readonly saveManager = new SaveManager(new LocalStorageProvider());
    private readonly settingsManager = new SettingsManager(this.saveManager, this.eventBus);
    private readonly audioManager = new AudioManager();
    private readonly localizationManager = new LocalizationManager();
    private readonly sceneManager = new SceneManager();
    private readonly gameManager = new GameManager(this.eventBus);
    private readonly levelService = new LevelService(new ResourcesLevelProvider());
    private readonly imageService = new ImageService(new ResourcesImageLoader());
    private readonly puzzleManager = new PuzzleManager(
        this.eventBus,
        this.gameManager,
        new PuzzleGenerator(new BacktrackingGenerationStrategy()),
        new PuzzleValidator(),
        new SnapSystem(),
    );
    private inputManager: InputManager | null = null;

    private settingsSubscription: (() => void) | null = null;
    private readonly boardOrigin: { x: number; y: number } | null = null;
    private readonly cellPiecesLayerSize: { x: number; y: number; };
    private readonly boardLayerSize: { x: number; y: number; };

    public constructor(
        boardOrigin: {x: number, y: number} | null = null,
        cellPiecesLayerSize: {x: number, y: number},
        boardLayerSize: {x: number, y: number}
    ) {
        this.boardOrigin = boardOrigin;
        this.cellPiecesLayerSize = cellPiecesLayerSize;
        this.boardLayerSize = boardLayerSize;
        this.settingsSubscription = this.eventBus.on('SettingsChanged', ({ settings }) => {
            this.audioManager.applySettings(settings);
            this.localizationManager.setLanguage(settings.language);
        });
    }

    public async initialize(): Promise<void> {
        await this.settingsManager.initialize();

        const levelId = this.levelService.getTrainingLevelId();
        const levelData = await this.levelService.getLevel(levelId);
        levelData.gridCellWidth = this.boardLayerSize.x / levelData.gridWidth;
        levelData.gridCellHeight = this.boardLayerSize.y / levelData.gridHeight;
        this.eventBus.emit('LevelLoaded', {
            levelId: levelData.id,
            gridWidth: levelData.gridWidth,
            gridHeight: levelData.gridHeight,
            gridCellWidth: levelData.gridCellWidth,
            gridCellHeight: levelData.gridCellHeight
        });

        this.puzzleManager.initializeLevel(levelData);
        this.inputManager = new InputManager(
            new DragSystem(
                this.puzzleManager,
                {
                    originWorldX: this.boardOrigin?.x ?? DEFAULT_BOARD_ORIGIN_WORLD_X,
                    originWorldY: this.boardOrigin?.y ?? DEFAULT_BOARD_ORIGIN_WORLD_Y,
                    cellSize: { x: levelData.gridCellWidth, y: levelData.gridCellHeight },
                    gridCellSize: { x: levelData.gridWidth, y: levelData.gridHeight },
                },
                levelData.snapThreshold,
            ),
            new RotationSystem(this.puzzleManager),
        );

        this.gameManager.startLevel(levelData.id);

        // Warm-up image loading cache for the active level.
        await this.imageService.getImage(levelData.imageId).catch(() => {
            // Placeholder content may be absent at early MVP stages.
        });
    }

    public dispose(): void {
        this.settingsSubscription?.();
        this.eventBus.clear();
    }

    public getSceneManager(): SceneManager {
        return this.sceneManager;
    }

    public getEventBus(): EventBus<GameEventMap> {
        return this.eventBus;
    }

    public getInputManager(): InputManager | null {
        return this.inputManager;
    }

    public getPuzzleManager(): PuzzleManager {
        return this.puzzleManager;
    }

    public getImageService(): ImageService {
        return this.imageService;
    }
}
