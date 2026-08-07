import { EventBus } from './Events/EventBus';
import { GameEventMap } from './Events/GameEventMap';
import { AudioManager } from '../Managers/AudioManager';
import { GameManager } from '../Managers/GameManager';
import { LocalizationManager } from '../Managers/LocalizationManager';
import { SaveManager } from '../Managers/SaveManager';
import { SceneManager } from '../Managers/SceneManager';
import { SettingsManager } from '../Managers/SettingsManager';
import { ProgressionManager } from '../Managers/ProgressionManager';
import { LevelService } from '../Services/LevelService';
import { ResourcesLevelProvider } from '../Services/Content/ResourcesLevelProvider';
import { ImageService } from '../Services/ImageService';
import { ResourcesImageLoader } from '../Services/Content/ResourcesImageLoader';
import { PuzzleManager } from '../Managers/PuzzleManager';
import { PuzzleValidator } from '../Validation/PuzzleValidator';
import { InputManager } from '../Input/InputManager';
import { DragSystem } from '../Input/DragSystem';
import { RotationSystem } from '../Input/RotationSystem';
import { _decorator, Component, director } from 'cc';
import { ServiceContainer } from './ServiceContainer';
import { SpriteFrameSliceService } from '../Services/SpriteFrameSliceService';
import { SuggestionManager } from '../Managers/SuggestionManager';
import { WalletManager } from '../Managers/WalletManager';
import { YandexService } from '../Services/YandexService';
import { CloudStorageProvider } from '../Services/Storage/CloudStorageProvider';
import { YandexAdManager } from '../Managers/YandexAdManager';
import { IapManager } from '../Managers/IapManager';
import { PuzzleGenerator } from '../Generation/PuzzleGenerator';
import { RectSwapGenerationStrategy } from '../Generation/RectSwapGenerationStrategy';
import { BacktrackingGenerationStrategy } from '../Generation/BacktrackingGenerationStrategy';
import { PieceFactory } from '../Generation/PieceFactory';

const { ccclass } = _decorator;

@ccclass('AppBootstrap')
export class AppBootstrap extends Component {

    public async onLoad(): Promise<void> {
        director.addPersistRootNode(this.node);
        this.registryServices();
        await this.initializeServices();
        await ServiceContainer.get(SceneManager).loadLobbyScene();
        ServiceContainer.get(YandexService).signalReady();
    }

    private async initializeServices() {
        await ServiceContainer.get(YandexService).initialize();
        await ServiceContainer.get(SettingsManager).initialize();
        await ServiceContainer.get(ProgressionManager).initialize();
        await ServiceContainer.get(IapManager).initialize();
    }

    private registryServices() {
        const spriteFrameSliceService = new SpriteFrameSliceService();
        const eventBus = new EventBus<GameEventMap>();
        const yandexService = new YandexService();
        const saveManager = new SaveManager(new CloudStorageProvider(yandexService));
        const settingsManager = new SettingsManager(saveManager, eventBus);
        const audioManager = new AudioManager();
        const localizationManager = new LocalizationManager();
        const sceneManager = new SceneManager();
        const gameManager = new GameManager(eventBus);
        const levelService = new LevelService(new ResourcesLevelProvider());
        const walletManager = new WalletManager(eventBus);
        const progressionManager = new ProgressionManager(saveManager, levelService, walletManager);
        const imageService = new ImageService(new ResourcesImageLoader());
        const suggestionManager = new SuggestionManager(progressionManager, eventBus);
        const yandexAdManager = new YandexAdManager(yandexService, settingsManager, progressionManager);
        const iapManager = new IapManager(yandexService, progressionManager, settingsManager);
        const puzzleGenerator = new PuzzleGenerator(
            new RectSwapGenerationStrategy(),
            new BacktrackingGenerationStrategy(),
        );
        const puzzleManager = new PuzzleManager(
            eventBus,
            gameManager,
            new PuzzleValidator(),
            new PieceFactory(puzzleGenerator),
        );

        const inputManager = new InputManager(
            new DragSystem(puzzleManager),
            new RotationSystem(puzzleManager),
        );
        
        ServiceContainer.register(InputManager, inputManager);
        ServiceContainer.register(EventBus, eventBus);
        ServiceContainer.register(SaveManager, saveManager);
        ServiceContainer.register(SettingsManager, settingsManager);
        ServiceContainer.register(AudioManager, audioManager);
        ServiceContainer.register(LocalizationManager, localizationManager);
        ServiceContainer.register(SceneManager, sceneManager);
        ServiceContainer.register(SpriteFrameSliceService, spriteFrameSliceService);
        ServiceContainer.register(GameManager, gameManager);
        ServiceContainer.register(LevelService, levelService);
        ServiceContainer.register(ProgressionManager, progressionManager);
        ServiceContainer.register(ImageService, imageService);
        ServiceContainer.register(PuzzleManager, puzzleManager);
        ServiceContainer.register(SuggestionManager, suggestionManager);
        ServiceContainer.register(WalletManager, walletManager);
        ServiceContainer.register(YandexService, yandexService);
        ServiceContainer.register(YandexAdManager, yandexAdManager);
        ServiceContainer.register(IapManager, iapManager);
    }
}
