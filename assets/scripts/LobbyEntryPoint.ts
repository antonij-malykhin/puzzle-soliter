import { _decorator, Component, log, Node } from 'cc';
import { AppBootstrap } from './Core/AppBootstrap';
import { LobbyUI } from './UI/Screens/LobbyUI';
import { LobbyController } from './Controllers/LobbyController';
import { ServiceContainer } from './Core/ServiceContainer';
import { ProgressionManager } from './Managers/ProgressionManager';
import { LobbyLevelCard } from './Data/Models/LobbyLevelCard';
import { ImageService } from './Services/ImageService';
import { LevelCatalogEntry } from './Data/Models/LevelCatalog';
import { LevelService } from './Services/LevelService';

const { ccclass, property } = _decorator;

@ccclass('LobbyEntryPoint')
export class LobbyEntryPoint extends Component {
    @property(LobbyUI)
    private lobbyUI!: LobbyUI;

    private appBootstrap: AppBootstrap | null = null;
    private onPlayButtonClicked: any;
    private lobbyController!: LobbyController;
    private progressionManager!: ProgressionManager;
    private catalogEntries: ReadonlyArray<LevelCatalogEntry> = [];
    private lobbyFlipLevelId: string | null = null;
    private levelService!: LevelService;
    private imageService!: ImageService;

    protected async onLoad(): Promise<void> {
        log('LobbyEntryPoint: Starting lobby initialization...');

        this.requestServices();
        await this.initialize();
        this.lobbyController.initialize(this.lobbyUI, {
            onPlayRequested: this.onPlayButtonClicked.bind(this),
            lobbyCards: this.getLobbyCards(),
            imageService: this.imageService,
        });
        this.lobbyUI.setPlayHandler(this.onPlayButtonClicked.bind(this));
        
        log('LobbyEntryPoint: Lobby initialized.');
        this.lobbyController.startLobby();
    }

    private async initialize() {
        this.catalogEntries = await this.levelService.getLevelCatalog();
    }

    private requestServices() {
        this.progressionManager = ServiceContainer.get(ProgressionManager);
        this.levelService = ServiceContainer.get(LevelService);
        this.imageService = ServiceContainer.get(ImageService);
    }

    public getLobbyCards(): ReadonlyArray<LobbyLevelCard> {
        const currentLevelId = this.progressionManager!.getCurrentLevelId();
        const orderedLevelIds = this.progressionManager!.getOrderedLevelIds();

        if (this.catalogEntries.length === 0) {
            return orderedLevelIds.map((levelId, index) => ({
                levelId,
                levelNumber: index + 1,
                gridX: (index % 4) + 1,
                gridY: Math.floor(index / 4) + 1,
                isUnlocked: this.progressionManager!.isUnlocked(levelId),
                isCompleted: this.progressionManager!.isCompleted(levelId),
                isCurrent: currentLevelId === levelId,
                shouldAnimateFlip: this.lobbyFlipLevelId === levelId,
            }));
        }

        return this.catalogEntries.map((entry) => ({
            levelId: entry.levelId,
            levelNumber: entry.levelNumber,
            gridX: entry.gridX,
            gridY: entry.gridY,
            cardImageId: entry.cardImageId,
            isUnlocked: this.progressionManager!.isUnlocked(entry.levelId),
            isCompleted: this.progressionManager!.isCompleted(entry.levelId),
            isCurrent: currentLevelId === entry.levelId,
            shouldAnimateFlip: this.lobbyFlipLevelId === entry.levelId,
        }));
    }
}
