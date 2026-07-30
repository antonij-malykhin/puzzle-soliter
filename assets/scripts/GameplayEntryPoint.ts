import { _decorator, Component, log, UITransform } from 'cc';
import { LevelCatalogEntry } from './Data/Models/LevelCatalog';
import { PuzzleStage } from './UI/Puzzle/PuzzleStage';
import { PerformanceMonitor } from './Utils/PerformanceMonitor';
import { EventBus } from './Core/Events/EventBus';
import { ServiceContainer } from './Core/ServiceContainer';
import { ImageService } from './Services/ImageService';
import { PuzzleManager } from './Managers/PuzzleManager';
import { InputManager } from './Input/InputManager';
import { AudioManager } from './Managers/AudioManager';
import { LocalizationManager } from './Managers/LocalizationManager';
import { ProgressionManager } from './Managers/ProgressionManager';
import { LevelService } from './Services/LevelService';
import { GameManager } from './Managers/GameManager';
import { SettingsManager } from './Managers/SettingsManager';
import { GameEventMap } from './Core/Events/GameEventMap';
import { GameplayController } from './Controllers/GameplayController';

const { ccclass, property } = _decorator;

@ccclass('GameplayEntryPoint')
export class GameplayEntryPoint extends Component {
    @property(PuzzleStage)
    private puzzleStage: PuzzleStage | null = null;

    @property(UITransform)
    private boardUITransform: UITransform | null = null;

    @property(UITransform)
    private piecesLayerUITransform: UITransform | null = null;

    private settingsSubscription: (() => void) | null = null;
    private completionSubscription: (() => void) | null = null;
    private catalogEntries: ReadonlyArray<LevelCatalogEntry> = [];
    private lobbyFlipLevelId: string | null = null;
    private pendingProgressSave: Promise<void> = Promise.resolve();
    private boardOrigin: { x: number; y: number } | null = null;
    private sharedInitialized = false;

    private progressionManager: ProgressionManager | null = null;
    private settingsManager!: SettingsManager;
    private imageService!: ImageService;
    private levelService!: LevelService;
    private gameManager!: GameManager;
    private puzzleManager!: PuzzleManager;
    private inputManager!: InputManager;
    private eventBus!: EventBus<GameEventMap>;
    sceneManager: any;
    private gameplayController!: GameplayController;

    protected async start(): Promise<void> {
        PerformanceMonitor.clear();
        PerformanceMonitor.setEnabled(true);
        PerformanceMonitor.mark('game-start');
        this.requestServices();
        log('EntryPoint: Starting game initialization...');

        this.boardOrigin = this.puzzleStage?.node.worldPosition ?? null;
        log('EntryPoint: Game initialization completed.');

        this.settingsSubscription = this.eventBus!.on('SettingsChanged', ({ settings }) => {
            ServiceContainer.get(AudioManager).applySettings(settings);
            ServiceContainer.get(LocalizationManager).setLanguage(settings.language);
        });

        this.completionSubscription = this.eventBus!.on('PuzzleCompleted', ({ levelId, elapsedSeconds }) => {
            this.pendingProgressSave = this.progressionManager!.markLevelCompleted(levelId, elapsedSeconds);
        });

        //TODO: Разделить инициализацию UI root на отдельные методы для лобби и геймплея, чтобы не дублировать код
        await this.gameplayController?.initialize(this.eventBus!, {
            activeLevelId: this.progressionManager!.getCurrentLevelId(),
            onVictoryNextRequested: () => {
                void this.openLobbyScene();
            }
        });

        log('EntryPoint: UI Root initialized.');

        this.puzzleStage?.initialize(
            this.puzzleManager,
            this.inputManager,
            this.eventBus!,
            this.imageService,
        );

        PerformanceMonitor.measure('game-init', 'game-start');
        PerformanceMonitor.reportMemory();
    }

    private requestServices() {
        this.progressionManager = ServiceContainer.get(ProgressionManager);
        this.settingsManager = ServiceContainer.get(SettingsManager);
        this.imageService = ServiceContainer.get(ImageService);
        this.levelService = ServiceContainer.get(LevelService);
        this.gameManager = ServiceContainer.get(GameManager);
        this.puzzleManager = ServiceContainer.get(PuzzleManager);
        this.inputManager = ServiceContainer.get(InputManager);
        this.eventBus = ServiceContainer.get(EventBus);
    }

    protected onDestroy(): void {
        PerformanceMonitor.report();
        PerformanceMonitor.reportMemory();

        this.puzzleStage?.dispose();
        this.dispose();
    }

    public async initializeGameplay(): Promise<void> {
        await this.initializeShared();

        const levelId = this.progressionManager!.getCurrentLevelId();
        const levelData = await this.levelService!.getLevel(levelId);
        //levelData.gridCellWidth = this.boardLayerSize.x / levelData.gridWidth;
        //levelData.gridCellHeight = this.boardLayerSize.y / levelData.gridHeight;
        this.eventBus.emit('LevelLoaded', {
            levelId: levelData.id,
            gridWidth: levelData.gridWidth,
            gridHeight: levelData.gridHeight,
            gridCellWidth: levelData.gridCellWidth,
            gridCellHeight: levelData.gridCellHeight
        });

        this.puzzleManager.initializeLevel(levelData);
        this.gameManager.startLevel(levelData.id);

        // Warm-up image loading cache for the active level.
        await this.imageService.getImage(levelData.imageId).catch(() => {
            // Placeholder content may be absent at early MVP stages.
        });
    }

    private async initializeShared(): Promise<void> {
        if (this.sharedInitialized) {
            return;
        }

        await ServiceContainer.get(SettingsManager).initialize();
        await ServiceContainer.get(ProgressionManager).initialize();
        this.catalogEntries = await ServiceContainer.get(LevelService).getLevelCatalog();
        this.sharedInitialized = true;
    }

    public dispose(): void {
        this.settingsSubscription?.();
        this.completionSubscription?.();
    }

    public async openLobbyScene(): Promise<void> {
        await this.pendingProgressSave;
        await this.sceneManager!.loadLobbyScene();
    }
}