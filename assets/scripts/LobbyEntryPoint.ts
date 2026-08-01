import { _decorator, Component, log, Node, SpriteFrame, UITransform } from 'cc';
import { AppBootstrap } from './Core/AppBootstrap';
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

const { ccclass, property } = _decorator;

@ccclass('LobbyEntryPoint')
export class LobbyEntryPoint extends Component {
    @property(LobbyUI)
    private lobbyUI!: LobbyUI;

    @property(UITransform)
    private lobbyLevelCardRootUiTransform!: UITransform;

    private regionCardCount: number = 25;
    private onPlayButtonClicked: () => void = () => {};
    private lobbyController!: LobbyController;
    private progressionManager!: ProgressionManager;
    private catalogData: LevelCatalogData | null = null;
    private lobbyFlipLevelId: string | null = null;
    private levelService!: LevelService;
    private imageService!: ImageService;
    private sceneService!: SceneManager;
    private imageSliceService!: SpriteFrameSliceService;
    private regionNumber: number = 1;

    protected async onLoad(): Promise<void> {
        log('LobbyEntryPoint: Starting lobby initialization...');

        this.onPlayButtonClicked = this.loadGameplayScene;
        this.requestServices();
        await this.initialize();
        const regionImage = await this.imageService.getImage(this.catalogData!.regionImageId);
        const lobbyCards = await this.getLobbyCards(regionImage);
        this.lobbyController.initialize(this.lobbyUI, {
            onPlayRequested: this.onPlayButtonClicked.bind(this),
            lobbyCards: lobbyCards,
        });
        this.lobbyUI.setPlayHandler(this.onPlayButtonClicked.bind(this));
        
        log('LobbyEntryPoint: Lobby initialized.');
        this.lobbyController.startLobby();
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
    }

    private loadGameplayScene() {
        this.sceneService.loadGameplayScene(GAMEPLAY_SCENE_NAME);
    }

    private async getLobbyCards(regionImage: SpriteFrame): Promise<ReadonlyArray<LobbyLevelCardPresentation>> {
        const currentLevelId = this.progressionManager!.getCurrentLevelId();
        const orderedLevelIds = this.progressionManager!.getOrderedLevelIds();
        const halfLevelsCount = Math.floor(this.regionCardCount / 5);
        const catalogLevelCardWidth = this.lobbyLevelCardRootUiTransform.width / halfLevelsCount;
        const catalogLevelCardHeight = this.lobbyLevelCardRootUiTransform.height / halfLevelsCount;

        const buildPresentation = async (card: LobbyLevelCard): Promise<LobbyLevelCardPresentation> => {
            const slicedRegionImage = await this.imageSliceService.sliceGridCell({
                sourceSpriteFrame: regionImage,
                gridWidth: halfLevelsCount,
                gridHeight: halfLevelsCount,
                cellX: card.gridX - 1,
                cellY: card.gridY - 1,
            });

            const backSpriteFrame = await this.imageService.getImage(card.cardBackFrontImageId!);

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

        if (!this.catalogData || this.catalogData.levels.length === 0) {
            const cards = this.catalogData!.levels.map((level) => ({
                levelId: level.levelId,
                levelNumber: level.levelNumber,
                gridX: level.gridX,
                gridY: level.gridY,
                isUnlocked: this.progressionManager!.isUnlocked(level.levelId),
                isCompleted: this.progressionManager!.isCompleted(level.levelId),
                isCurrent: currentLevelId === level.levelId,
                shouldAnimateFlip: this.lobbyFlipLevelId === level.levelId,
                cardBackFrontImageId: level.cardBackFrontImageId, // Placeholder for card back/front image ID
            }));

			return Promise.all(cards.map((card) => buildPresentation(card)));
        }

        const cards = this.catalogData!.levels.map((entry) => ({
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
