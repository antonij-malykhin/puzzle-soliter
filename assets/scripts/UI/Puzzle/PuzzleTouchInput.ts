import { EventKeyboard, EventTouch, input, Input, KeyCode, Node, ScrollView, Vec2 } from 'cc';
import { InputManager } from '../../Input/InputManager';
import { PuzzleManager } from '../../Managers/PuzzleManager';
import { PuzzlePiece } from '../../Puzzle/PuzzlePiece';
import { PerformanceMonitor } from '../../Utils/PerformanceMonitor';
import { PieceRenderer } from './PieceRenderer';

export interface PuzzleTouchContext {
    readonly inputManager: InputManager;
    readonly puzzleManager: PuzzleManager;
    readonly pieceLayer: Node | null;
    readonly pieceTrayLayer: Node | null;
    readonly pieceScrollView: ScrollView | null;
    getRenderers(): ReadonlyMap<string, PieceRenderer>;
    pickPieceAt(worldX: number, worldY: number): PuzzlePiece | null;
    stopSuggestionAnimation(): void;
    isRectSwapMergeMode(): boolean;
    snapPieceToBoard(pieceId: string): void;
    snapGroupToCurrentOrigin(pieceIds: ReadonlyArray<string>): void;
    snapPieceToTrayAndAnimate(pieceId: string): void;
}

export class PuzzleTouchInput {
    private activePieceId: string | null = null;
    private activeDragGroupPieceIds: string[] = [];
    private lastPointerPosition: Vec2 | null = null;

    public constructor(private readonly context: PuzzleTouchContext) { }

    public bind(touchInputNode: Node | null): void {
        if (touchInputNode) {
            touchInputNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this, true);
            touchInputNode.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this, true);
            touchInputNode.on(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
            touchInputNode.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this, true);
        } else {
            input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
            input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
            input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
            input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    public unbind(touchInputNode: Node | null): void {
        if (touchInputNode) {
            touchInputNode.off(Node.EventType.TOUCH_START, this.onTouchStart, this, true);
            touchInputNode.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this, true);
            touchInputNode.off(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
            touchInputNode.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this, true);
        } else {
            input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
            input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
            input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
            input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }

        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onTouchStart(event: EventTouch): void {
        PerformanceMonitor.mark('touch-start');

        const { inputManager } = this.context;
        const location = event.getUILocation();

        PerformanceMonitor.mark('hit-test-start');
        const selectedPiece = this.context.pickPieceAt(location.x, location.y);
        PerformanceMonitor.measure('hit-test', 'hit-test-start');
        if (!selectedPiece) {
            return;
        }

        this.context.stopSuggestionAnimation();

        this.activePieceId = selectedPiece.getId();
        this.activeDragGroupPieceIds = this.context.isRectSwapMergeMode()
            ? [...(this.context.puzzleManager.getGroupPieceIds(this.activePieceId) ?? [this.activePieceId])]
            : [this.activePieceId];
        this.lastPointerPosition = new Vec2(location.x, location.y);
        const scrollView = this.context.pieceScrollView;
        if (scrollView) {
            scrollView.enabled = false;
        }

        inputManager.beginDrag(this.activePieceId, { x: location.x, y: location.y });

        const pieceRenderer = this.context.getRenderers().get(this.activePieceId);
        if (!pieceRenderer) {
            console.warn('Piece renderer not found for piece ID:', this.activePieceId);
            return;
        }

        this.activeDragGroupPieceIds.forEach((id) => {
            const renderer = this.context.getRenderers().get(id);
            if (!renderer) {
                return;
            }

            renderer.node.setParent(this.context.pieceLayer);
            renderer.node.setSiblingIndex(Number.MAX_SAFE_INTEGER);
        });
    }

    private onTouchMove(event: EventTouch): void {
        const { inputManager } = this.context;
        if (!this.activePieceId) {
            return;
        }

        const location = event.getUILocation();
        const nextPointerPosition = new Vec2(location.x, location.y);
        if (this.lastPointerPosition) {
            const deltaX = nextPointerPosition.x - this.lastPointerPosition.x;
            const deltaY = nextPointerPosition.y - this.lastPointerPosition.y;
            this.activeDragGroupPieceIds.forEach((id) => {
                const renderer = this.context.getRenderers().get(id);
                if (!renderer) {
                    return;
                }

                const currentWorldPosition = renderer.node.worldPosition;
                renderer.node.setWorldPosition(
                    currentWorldPosition.x + deltaX,
                    currentWorldPosition.y + deltaY,
                    currentWorldPosition.z,
                );
            });
        }

        this.lastPointerPosition = nextPointerPosition;
        inputManager.updatePointer({ x: location.x, y: location.y });
    }

    private onTouchEnd(): void {
        PerformanceMonitor.mark('drop-start');
        const { inputManager } = this.context;
        const scrollView = this.context.pieceScrollView;
        if (!this.activePieceId) {
            if (scrollView) {
                scrollView.enabled = true;
            }
            return;
        }

        const pieceId = this.activePieceId;
        const placed = inputManager.endDrag();
        PerformanceMonitor.measure('placement-check', 'drop-start');

        if (placed) {
            if (this.context.isRectSwapMergeMode()) {
                this.context.snapGroupToCurrentOrigin(this.activeDragGroupPieceIds);
            } else {
                this.context.snapPieceToBoard(pieceId);
            }
        } else if (this.context.isRectSwapMergeMode()) {
            this.context.snapGroupToCurrentOrigin(this.activeDragGroupPieceIds);
        } else {
            this.context.snapPieceToTrayAndAnimate(pieceId);
        }

        this.activePieceId = null;
        this.activeDragGroupPieceIds = [];
        this.lastPointerPosition = null;
        if (scrollView) {
            scrollView.enabled = true;
        }
    }

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode !== KeyCode.KEY_R) {
            return;
        }

        const { inputManager, puzzleManager } = this.context;
        if (this.activePieceId) {
            inputManager.rotatePiece(this.activePieceId);
            return;
        }

        const nextUnlocked = puzzleManager.getPieces().find((piece) => !piece.isLocked());
        if (nextUnlocked) {
            inputManager.rotatePiece(nextUnlocked.getId());
        }
    }
}
