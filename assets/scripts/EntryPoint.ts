import { _decorator, Component, debug, log, Node, UITransform } from 'cc';
import { AppBootstrap } from './Core/AppBootstrap';
import { UIRoot } from './UI/UIRoot';
import { PuzzleStage } from './UI/Puzzle/PuzzleStage';
import { PerformanceMonitor } from './Utils/PerformanceMonitor';

const { ccclass, property } = _decorator;

@ccclass('EntryPoint')
export class EntryPoint extends Component {
    @property(UIRoot)
    private uiRoot: UIRoot | null = null;

    @property(PuzzleStage)
    private puzzleStage: PuzzleStage | null = null;

    @property(UITransform)
    private boardUITransform: UITransform | null = null;

    @property(UITransform)
    private piecesLayerUITransform: UITransform | null = null;

    private appBootstrap: AppBootstrap | null = null;

    protected async start(): Promise<void> {
        PerformanceMonitor.clear();
        PerformanceMonitor.setEnabled(true);
        PerformanceMonitor.mark('game-start');

        log('EntryPoint: Starting game initialization...');
        this.appBootstrap = new AppBootstrap(
            this.puzzleStage?.node.worldPosition,
            {x: this.boardUITransform?.contentSize.x ?? 0, y: this.boardUITransform?.contentSize.y ?? 0},
            {x: this.piecesLayerUITransform?.contentSize.x ?? 0, y: this.piecesLayerUITransform?.contentSize.y ?? 0},
        );
        await this.appBootstrap.initialize();
        log('EntryPoint: Game initialization completed.');

        this.uiRoot = this.uiRoot ?? this.createUIRoot();
        await this.uiRoot.initialize(this.appBootstrap.getEventBus());
        log('EntryPoint: UI Root initialized.');

        this.puzzleStage = this.puzzleStage ?? this.createPuzzleStage();
        const inputManager = this.appBootstrap.getInputManager();
        const imageService = this.appBootstrap.getImageService();
        if (inputManager && imageService) {
            this.puzzleStage.initialize(
                this.appBootstrap.getPuzzleManager(),
                inputManager,
                this.appBootstrap.getEventBus(),
                imageService,
            );
        }

        PerformanceMonitor.measure('game-init', 'game-start');
        PerformanceMonitor.reportMemory();
    }

    protected onDestroy(): void {
        PerformanceMonitor.report();
        PerformanceMonitor.reportMemory();

        this.puzzleStage?.dispose();
        this.uiRoot?.dispose();
        this.appBootstrap?.dispose();
        this.appBootstrap = null;
    }

    private createUIRoot(): UIRoot {
        const rootNode = new Node('UIRootNode');
        rootNode.setParent(this.node);
        return rootNode.addComponent(UIRoot);
    }

    private createPuzzleStage(): PuzzleStage {
        const stageNode = new Node('PuzzleStageNode');
        stageNode.setParent(this.node);
        return stageNode.addComponent(PuzzleStage);
    }
}


