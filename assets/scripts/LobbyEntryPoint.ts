import { _decorator, Button, Component, log, SpriteFrame, UITransform } from 'cc';
import { EventBus } from './Core/Events/EventBus';
import { GameEventMap } from './Core/Events/GameEventMap';
import { LobbyUI } from './UI/Screens/LobbyUI';
import { LobbyController } from './Controllers/LobbyController';
import { ServiceContainer } from './Core/ServiceContainer';
import { ProgressionManager } from './Managers/ProgressionManager';
import { LobbyLevelCard } from './Data/Models/LobbyLevelCard';
import { LobbyLevelCardPresentation } from './Data/Models/LobbyLevelCardPresentation';
import { ImageService } from './Services/ImageService';
import { LevelCatalogData } from './Data/Models/LevelCatalog';
import { LevelService } from './Services/LevelService';
import { SceneManager } from './Managers/SceneManager';
import { GAMEPLAY_SCENE_NAME } from './Core/Config/GameConstants';
import { SpriteFrameSliceService } from './Services/SpriteFrameSliceService';
import { YandexAdManager } from './Managers/YandexAdManager';
import { LoadingService } from './Services/LoadingService';
import { LocalizationManager } from './Managers/LocalizationManager';
import { AudioManager } from './Managers/AudioManager';
import { MUSIC_PLAYLIST_IDS } from './Core/Config/AudioIds';
import { LobbyDebugPanel } from './UI/Screens/LobbyDebugPanel';

const { ccclass, property } = _decorator;

@ccclass('LobbyEntryPoint')
export class LobbyEntryPoint extends Component {
    @property(LobbyUI)
    private lobbyUI!: LobbyUI;

    @property(UITransform)
    private lobbyLevelCardRootUiTransform!: UITransform;

    @property(Button)
    private debugCompleteRegionButton: Button | null = null;

    @property(LobbyDebugPanel)
    private debugPanel: LobbyDebugPanel | null = null;

    private regionCardCount: number = 25;
    private onPlayButtonClicked: () => void = () => {};
    private lobbyController!: LobbyController;
    private progressionManager!: ProgressionManager;
    private eventBus!: EventBus<GameEventMap>;
    private catalogData: LevelCatalogData | null = null;
    private lobbyFlipLevelId: string | null = null;
    private levelService!: LevelService;
    private imageService!: ImageService;
    private sceneService!: SceneManager;
    private imageSliceService!: SpriteFrameSliceService;
    private regionNumber: number = 1;
    private yandexAdManager!: YandexAdManager;
    private audioManager!: AudioManager;
    private regionImage: SpriteFrame | null = null;

    protected async onLoad(): Promise<void> {
        log('LobbyEntryPoint: Starting lobby initialization...');

        this.onPlayButtonClicked = this.loadGameplayScene;
        this.requestServices();
        this.audioManager.playMusicPlaylist(MUSIC_PLAYLIST_IDS);
        this.setLoadingMessage();

        try {
            await this.initialize();
            this.regionImage = await this.imageService.getImageById(this.catalogData!.regionImageId);

            this.debugPanel?.initialize(this.progressionManager, async () => {
                await this.sceneService.loadLobbyScene();
            });
            
            if (this.debugCompleteRegionButton) {
                this.debugCompleteRegionButton.node.on(Button.EventType.CLICK, async () => {
                    await this.progressionManager.markRegionCompleted();
                    this.lobbyUI.showRegionComplete(this.regionImage!, this.loadNextRegion.bind(this));
                    await this.lobbyUI.show();
                }, this);
            }

            if (this.progressionManager.isCurrentRegionCompleted()) {
                this.lobbyUI.showRegionComplete(this.regionImage!, this.loadNextRegion.bind(this));
                await this.lobbyUI.show();
                log('LobbyEntryPoint: Region complete screen shown.');
                return;
            }

            const lobbyCards = await this.getLobbyCards(this.regionImage);
            await this.lobbyController.initialize(this.eventBus, this.lobbyUI, this.catalogData!.spacingX, this.catalogData!.spacingY, this.catalogData!.cols, this.catalogData!.rows, {
                onPlayRequested: this.onPlayButtonClicked.bind(this),
                lobbyCards: lobbyCards,
            });
            
            log('LobbyEntryPoint: Lobby initialized.');
            this.lobbyController.startLobby();
        } finally {
            this.hideLoadingHud();
        }

        this.yandexAdManager.showInterstitialIfAllowed();
    }

    private async initialize() {
        this.regionNumber = this.progressionManager.getCurrentRegionNumber();
        this.catalogData = await this.levelService.getLevelCatalog(this.regionNumber);
        this.regionCardCount = this.catalogData.levels.length;
    }

    private requestServices() {
        this.lobbyController = new LobbyController();
        this.imageSliceService = ServiceContainer.get(SpriteFrameSliceService);
        this.progressionManager = ServiceContainer.get(ProgressionManager);
        this.levelService = ServiceContainer.get(LevelService);
        this.imageService = ServiceContainer.get(ImageService);
        this.sceneService = ServiceContainer.get(SceneManager);
        this.eventBus = ServiceContainer.get(EventBus);
        this.yandexAdManager = ServiceContainer.get(YandexAdManager);
        this.audioManager = ServiceContainer.get(AudioManager);
    }

    private loadGameplayScene() {
        this.sceneService.loadGameplayScene(GAMEPLAY_SCENE_NAME);
    }

    private setLoadingMessage() {
        const loadingService = ServiceContainer.get(LoadingService);
        const localization = ServiceContainer.get(LocalizationManager);
        loadingService.setMessage(localization.t('loadingLobby'));
    }

    private hideLoadingHud() {
        ServiceContainer.get(LoadingService).hide();
    }

    private async loadNextRegion(): Promise<void> {
        await this.progressionManager.advanceToNextRegion();
        this.sceneService.loadLobbyScene();
    }

    private async getLobbyCards(regionImage: SpriteFrame | null): Promise<ReadonlyArray<LobbyLevelCardPresentation>> {
        if (!regionImage) {
            throw new Error('Region image is not loaded.');
        }

        const currentLevelId = this.progressionManager!.getCurrentLevelId();
        const catalogLevelCardWidth = this.lobbyLevelCardRootUiTransform.width / this.catalogData!.cols;
        const catalogLevelCardHeight = this.lobbyLevelCardRootUiTransform.height / this.catalogData!.rows;

        const buildPresentation = async (card: LobbyLevelCard): Promise<LobbyLevelCardPresentation> => {
            const slicedRegionImage = await this.imageSliceService.sliceGridCell({
                sourceSpriteFrame: regionImage,
                gridWidth: this.catalogData!.cols,
                gridHeight: this.catalogData!.rows,
                cellX: card.gridX - 1,
                cellY: card.gridY - 1,
            });

            const backSpriteFrame = await this.imageService.getImageById(card.cardBackFrontImageId!);

            return {
                levelId: card.levelId,
                levelNumber: card.levelNumber,
                gridX: card.gridX,
                gridY: card.gridY,
                width: catalogLevelCardWidth,
                height: catalogLevelCardHeight,
                isUnlocked: card.isUnlocked,
                isCompleted: card.isCompleted,
                isCurrent: card.isCurrent,
                shouldAnimateFlip: card.shouldAnimateFlip,
                frontSpriteFrame: slicedRegionImage,
                backSpriteFrame: backSpriteFrame,
                regionId: `region-${Math.floor((card.levelNumber - 1) / this.regionCardCount) + 1}`,
                regionCardIndex: (card.levelNumber - 1) % this.regionCardCount,
                regionCardCount: this.regionCardCount,
            };
        };

        if (!this.catalogData) {
            throw new Error('Level catalog is not loaded.');
        }

        const cards = this.catalogData.levels.map((entry) => ({
            levelId: entry.levelId,
            levelNumber: entry.levelNumber,
            gridX: entry.gridX,
            gridY: entry.gridY,
            cardBackFrontImageId: entry.cardBackFrontImageId,
            isUnlocked: this.progressionManager!.isUnlocked(entry.levelId),
            isCompleted: this.progressionManager!.isCompleted(entry.levelId),
            isCurrent: currentLevelId === entry.levelId,
            shouldAnimateFlip: this.lobbyFlipLevelId === entry.levelId,
        }));

        return Promise.all(cards.map((card) => buildPresentation(card)));
    }
}
