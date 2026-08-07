import { _decorator, Component, UITransform } from 'cc';
import { PuzzleStage } from './UI/Puzzle/PuzzleStage';
import { PerformanceMonitor } from './Utils/PerformanceMonitor';
import { ServiceContainer } from './Core/ServiceContainer';
import { ImageService } from './Services/ImageService';
import { PuzzleManager } from './Managers/PuzzleManager';
import { SuggestionManager } from './Managers/SuggestionManager';
import { InputManager } from './Input/InputManager';
import { ProgressionManager } from './Managers/ProgressionManager';
import { LevelService } from './Services/LevelService';
import { GameManager } from './Managers/GameManager';
import { EventBus } from './Core/Events/EventBus';
import { GameEventMap } from './Core/Events/GameEventMap';
import { GameplayUI } from './UI/GameplayUI';
import { SceneManager } from './Managers/SceneManager';
import { SpriteFrameSliceService } from './Services/SpriteFrameSliceService';
import { GameplaySession } from './Controllers/GameplaySession';
import { YandexAdManager } from './Managers/YandexAdManager';

const { ccclass, property } = _decorator;

@ccclass('GameplayEntryPoint')
export class GameplayEntryPoint extends Component {
    @property(PuzzleStage)
    private puzzleStage: PuzzleStage | null = null;

    @property(UITransform)
    private boardUITransform: UITransform | null = null;

    @property(GameplayUI)
    private gameplayUI: GameplayUI | null = null;

    private session: GameplaySession | null = null;

    protected async start(): Promise<void> {
        this.session = new GameplaySession(
            {
                eventBus: ServiceContainer.get<EventBus<GameEventMap>>(EventBus),
                imageService: ServiceContainer.get(ImageService),
                levelService: ServiceContainer.get(LevelService),
                gameManager: ServiceContainer.get(GameManager),
                puzzleManager: ServiceContainer.get(PuzzleManager),
                inputManager: ServiceContainer.get(InputManager),
                sceneManager: ServiceContainer.get(SceneManager),
                progressionManager: ServiceContainer.get(ProgressionManager),
                suggestionManager: ServiceContainer.get(SuggestionManager),
                yandexAdManager: ServiceContainer.get(YandexAdManager),
                spriteFrameSliceService: ServiceContainer.get(SpriteFrameSliceService),
            },
            {
                puzzleStage: this.puzzleStage,
                gameplayUI: this.gameplayUI,
                boardUITransform: this.boardUITransform,
            },
        );

        await this.session.start();
    }

    protected onDestroy(): void {
        this.session?.dispose();
        this.session = null;
        PerformanceMonitor.report();
        PerformanceMonitor.reportMemory();
    }
}
