import { _decorator, Component, Node } from 'cc';
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

    private appBootstrap: AppBootstrap | null = null;

    protected async start(): Promise<void> {
        PerformanceMonitor.clear();
        PerformanceMonitor.setEnabled(true);
        PerformanceMonitor.mark('game-start');

        this.appBootstrap = new AppBootstrap(this.puzzleStage?.node.worldPosition);
        await this.appBootstrap.initialize();

        this.uiRoot = this.uiRoot ?? this.createUIRoot();
        await this.uiRoot.initialize(this.appBootstrap.getEventBus());

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


