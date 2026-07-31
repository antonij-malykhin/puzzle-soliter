import { EventBus } from './Events/EventBus';
import { GameEventMap } from './Events/GameEventMap';
import { AudioManager } from '../Managers/AudioManager';
import { GameManager } from '../Managers/GameManager';
import { LocalizationManager } from '../Managers/LocalizationManager';
import { SaveManager } from '../Managers/SaveManager';
import { SceneManager } from '../Managers/SceneManager';
import { SettingsManager } from '../Managers/SettingsManager';
import { ProgressionManager } from '../Managers/ProgressionManager';
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
import { _decorator, Component, director, UITransform } from 'cc';
import { ServiceContainer } from './ServiceContainer';
import { AppConfigService } from '../Services/AppConfigService';

const { ccclass } = _decorator;

@ccclass('AppBootstrap')
export class AppBootstrap extends Component {

    public async onLoad(): Promise<void> {
        director.addPersistRootNode(this.node);
        this.registryServices();
        await this.initializeServices();
        await ServiceContainer.get(SceneManager).loadLobbyScene();
    }

    private async initializeServices() {
        await ServiceContainer.get(SettingsManager).initialize();
        await ServiceContainer.get(ProgressionManager).initialize();
    }

    private registryServices() {
        const eventBus = new EventBus<GameEventMap>();
        const saveManager = new SaveManager(new LocalStorageProvider());
        const settingsManager = new SettingsManager(saveManager, eventBus);
        const audioManager = new AudioManager();
        const localizationManager = new LocalizationManager();
        const sceneManager = new SceneManager();
        const gameManager = new GameManager(eventBus);
        const levelService = new LevelService(new ResourcesLevelProvider());
        const progressionManager = new ProgressionManager(saveManager, levelService);
        const imageService = new ImageService(new ResourcesImageLoader());
        const appConfigService = new AppConfigService();
        const puzzleManager = new PuzzleManager(
            eventBus,
            gameManager,
            new PuzzleGenerator(new BacktrackingGenerationStrategy()),
            new PuzzleValidator(),
            new SnapSystem(),
        );

        const inputManager = new InputManager(
            new DragSystem(
                puzzleManager,
                {
                    originWorldX: DEFAULT_BOARD_ORIGIN_WORLD_X,
                    originWorldY: DEFAULT_BOARD_ORIGIN_WORLD_Y,
                    cellSize: { x: 300, y: 300 },
                    gridDimentionSize: { x: 3, y: 3 },
                },
                10,
            ),
            new RotationSystem(puzzleManager),
        );
        
        ServiceContainer.register(InputManager, inputManager);
        ServiceContainer.register(EventBus, eventBus);
        ServiceContainer.register(SaveManager, saveManager);
        ServiceContainer.register(SettingsManager, settingsManager);
        ServiceContainer.register(AudioManager, audioManager);
        ServiceContainer.register(LocalizationManager, localizationManager);
        ServiceContainer.register(SceneManager, sceneManager);
        ServiceContainer.register(GameManager, gameManager);
        ServiceContainer.register(LevelService, levelService);
        ServiceContainer.register(ProgressionManager, progressionManager);
        ServiceContainer.register(ImageService, imageService);
        ServiceContainer.register(PuzzleManager, puzzleManager);
        ServiceContainer.register(AppConfigService, appConfigService);
    }
}
