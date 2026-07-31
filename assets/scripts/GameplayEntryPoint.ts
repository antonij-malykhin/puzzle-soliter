import { _decorator, Component, UITransform } from 'cc';
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
import { GameEventMap } from './Core/Events/GameEventMap';
import { GameplayController } from './Controllers/GameplayController';
import { LevelData } from './Data/Models/LevelData';
import { SceneManager } from './Managers/SceneManager';
import { GameplayUI } from './UI/GameplayUI';

const { ccclass, property } = _decorator;

@ccclass('GameplayEntryPoint')
export class GameplayEntryPoint extends Component {
    @property(PuzzleStage)
    private puzzleStage: PuzzleStage | null = null;

    @property(UITransform)
    private boardUITransform: UITransform | null = null;

    @property(GameplayUI)
    private gameplayUI: GameplayUI | null = null;

    private settingsSubscription: (() => void) | null = null;

    private progressionManager: ProgressionManager | null = null;
    private imageService!: ImageService;
    private levelService!: LevelService;
    private gameManager!: GameManager;
    private puzzleManager!: PuzzleManager;
    private inputManager!: InputManager;
    private eventBus!: EventBus<GameEventMap>;
    private sceneManager: SceneManager | null = null;
    private gameplayController: GameplayController | null = null;
    private boardLayerSize: { x: number; y: number } | null = null;
    private levelData!: LevelData;
    private boardOrigine!: { x: number; y: number; };

    protected async start(): Promise<void> {
        PerformanceMonitor.clear();
        PerformanceMonitor.setEnabled(true);
        PerformanceMonitor.mark('game-start');
        this.requestServices();
        await this.updateInputManager();

        this.settingsSubscription = this.eventBus!.on('SettingsChanged', ({ settings }) => {
            ServiceContainer.get(AudioManager).applySettings(settings);
            ServiceContainer.get(LocalizationManager).setLanguage(settings.language);
        });

        this.puzzleManager.initializeLevel(this.levelData);
        this.puzzleStage?.initialize(
            this.puzzleManager,
            this.inputManager,
            this.eventBus!,
            this.imageService,
        );
        
        
        // Warm-up image loading cache for the active level.
        await this.imageService.getImage(this.levelData.imageId).catch(() => {
            // Placeholder content may be absent at early MVP stages.
        });
        
        //TODO: Разделить инициализацию UI root на отдельные методы для лобби и геймплея, чтобы не дублировать код
        await this.gameplayController?.initialize(
            this.eventBus!,
            this.gameplayUI!,
            this.gameManager,
            this.sceneManager!,
            this.progressionManager!,
            this.progressionManager!.getCurrentLevelId()
        );

        this.eventBus.emit('LevelLoaded', {
            levelId: this.levelData.id,
            gridColumnCount: this.levelData.gridColumnCount,
            gridRowCount: this.levelData.gridRowCount,
            gridCellWidth: this.levelData.gridCellWidth,
            gridCellHeight: this.levelData.gridCellHeight
        });

        PerformanceMonitor.measure('game-init', 'game-start');
        PerformanceMonitor.reportMemory();
        this.gameplayController?.startGameplay();
    }

    private async updateInputManager() {
        const levelId = this.progressionManager!.getCurrentLevelId();
        this.levelData = await this.levelService!.getLevel(levelId);
        this.boardLayerSize = this.boardUITransform!.contentSize;
        this.boardOrigine = { x: this.boardUITransform?.node.worldPosition.x ?? 0, y: this.boardUITransform?.node.worldPosition.y ?? 0 };
        this.levelData.gridCellWidth = this.boardLayerSize.x / this.levelData.gridColumnCount;
        this.levelData.gridCellHeight = this.boardLayerSize.y / this.levelData.gridRowCount;
        this.inputManager.setupBoardConfiguration(this.levelData, this.boardOrigine);
    }

    private requestServices() {
        this.gameplayController = new GameplayController();
        this.sceneManager = ServiceContainer.get(SceneManager);
        this.progressionManager = ServiceContainer.get(ProgressionManager);
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

    public dispose(): void {
        this.settingsSubscription?.();
        this.gameplayController?.dispose();
        this.gameplayController = null;
    }
}