import {
    _decorator,
    Color,
    Component,
    EventKeyboard,
    EventTouch,
    Graphics,
    input,
    Input,
    KeyCode,
    Node,
    UITransform,
    Vec2,
    Vec3,
    tween,
    Prefab,
    Sprite,
    SpriteFrame,
    ScrollView,
    log,
} from 'cc';
import {
    DEFAULT_BOARD_ORIGIN_WORLD_X,
    DEFAULT_BOARD_ORIGIN_WORLD_Y,
    DEFAULT_PIECE_TRAY_COLUMN_GAP,
    DEFAULT_PIECE_TRAY_ROW_GAP,
} from '../../Core/Config/GameConstants';
import { EventBus } from '../../Core/Events/EventBus';
import { GameEventMap } from '../../Core/Events/GameEventMap';
import { InputManager } from '../../Input/InputManager';
import { PuzzleManager } from '../../Managers/PuzzleManager';
import { PuzzlePiece } from '../../Puzzle/PuzzlePiece';
import { PieceRenderer } from './PieceRenderer';
import { ImageBoardRenderer } from '../ImageBoardRenderer';
import { ImageService } from '../../Services/ImageService';
import { PieceNodePool } from '../../Utils/PieceNodePool';
import { PerformanceMonitor } from '../../Utils/PerformanceMonitor';
import { BoardCoordinateMapper } from '../../Utils/BoardCoordinateMapper';

const { ccclass, property } = _decorator;
const TOP_LEFT_ANCHOR_X = 0;
const TOP_LEFT_ANCHOR_Y = 1;

@ccclass('PuzzleStage')
export class PuzzleStage extends Component {
    private readonly pieceRenderersById = new Map<string, PieceRenderer>();
    private readonly pieceTrayPositionsById = new Map<string, Vec3>();
    private readonly disposables: Array<() => void> = [];

    @property(Node)
    private boardLayer: Node | null = null;
    @property(Node)
    private pieceTrayLayer: Node | null = null;
    @property(Prefab)
    private piecePrefab: Prefab | null = null;
    @property(SpriteFrame)
    private defaultSpriteFrame: SpriteFrame | null = null;
    @property(Node)
    private pieceLayer: Node | null = null;

    private imageRenderer: ImageBoardRenderer | null = null;
    private pieceNodePool: PieceNodePool | null = null;
    private inputManager: InputManager | null = null;
    private puzzleManager: PuzzleManager | null = null;
    private imageService: ImageService | null = null;
    private activePieceId: string | null = null;

    @property(Node)
    private touchInputNode: Node | null = null; // обычно Content/Viewport ScrollView

    @property(ScrollView)
    private pieceScrollView: ScrollView | null = null;

    public initialize(
        puzzleManager: PuzzleManager,
        inputManager: InputManager,
        eventBus: EventBus<GameEventMap>,
        imageService: ImageService,
    ): void {
        this.dispose();

        this.inputManager = inputManager;
        this.puzzleManager = puzzleManager;
        this.imageService = imageService;
        this.imageRenderer = new ImageBoardRenderer(imageService);
        this.pieceNodePool = new PieceNodePool(32, this.piecePrefab); // Pool up to 32 pieces
        this.ensureLayers();

        this.renderBoard();
        void this.renderImage();
        void this.renderPieces();

        this.disposables.push(eventBus.on('PiecePlaced', ({ pieceId }) => {
            this.snapPieceNodeToBoard(pieceId);
        }));

        this.disposables.push(eventBus.on('PieceRotated', ({ pieceId, rotation }) => {
            const pieceRenderer = this.pieceRenderersById.get(pieceId);
            if (pieceRenderer) {
                pieceRenderer.node.setRotationFromEuler(0, 0, -rotation * 90);
            }
        }));

        this.bindTouchInput();
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    public dispose(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;

        this.unbindTouchInput();
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);

        this.imageRenderer?.cleanup();
        this.pieceNodePool?.clear();
        this.pieceRenderersById.clear();
        this.pieceTrayPositionsById.clear();

        this.imageService = null;
        this.activePieceId = null;
    }

    protected onDestroy(): void {
        this.dispose();
    }

    private ensureLayers(): void {
        if (!this.boardLayer) {
            this.boardLayer = new Node('BoardLayer');
            this.boardLayer.setParent(this.node);
        }

        if (!this.pieceTrayLayer) {
            this.pieceTrayLayer = new Node('PieceTrayLayer');
            this.pieceTrayLayer.setParent(this.node);
        }
        if (!this.pieceLayer) {
            this.pieceLayer = new Node('PieceLayer');
            this.pieceLayer.setParent(this.node);
        }

        this.ensureTopLeftAnchor(this.boardLayer);
        this.ensureTopLeftAnchor(this.pieceTrayLayer);
        this.ensureTopLeftAnchor(this.pieceLayer);
    }

    private renderBoard(): void {
        const board = this.puzzleManager?.getBoard();
        if (!board || !this.boardLayer) {
            return;
        }

        this.boardLayer.removeAllChildren();

        const graphics = this.boardLayer.getComponent(Graphics) ?? this.boardLayer.addComponent(Graphics);
        graphics.clear();
        graphics.lineWidth = 2;
        graphics.strokeColor = new Color(80, 90, 120, 255);

        const mapper = this.createBoardMapper();
        if (!mapper) {
            return;
        }

        const gridWidth = mapper.getGridWidth();
        const gridHeight = mapper.getGridHeight();
        const cellSize = mapper.getCellSize();
        const fullWidth = mapper.getFullWidth();
        const fullHeight = mapper.getFullHeight();
        const topLeft = mapper.getTopLeftWorld();

        for (let index = 0; index <= gridWidth; index += 1) {
            const offset = index * cellSize;
            const verticalX = topLeft.x + offset;

            graphics.moveTo(verticalX, topLeft.y);
            graphics.lineTo(verticalX, topLeft.y - fullHeight);
        }

        for (let index = 0; index <= gridHeight; index += 1) {
            const offset = index * cellSize;
            const horizontalY = topLeft.y - offset;
            graphics.moveTo(topLeft.x, horizontalY);
            graphics.lineTo(topLeft.x + fullWidth, horizontalY);
        }

        for (const cell of board.getCells()) {
            const cellCoordinate = cell.getCoordinate();
            const cellNode = new Node(`BoardCell_${cellCoordinate.x}_${cellCoordinate.y}`);
            cellNode.setParent(this.boardLayer);
            const cellTransform = cellNode.addComponent(UITransform);
            const cellSprite = cellNode.addComponent(Sprite);
            cellSprite.type = Sprite.Type.SIMPLE;
            cellSprite.spriteFrame = this.defaultSpriteFrame;
            cellSprite.color = new Color(255, 255, 255, 150); // Transparent fill
            cellTransform.setContentSize(cellSize, cellSize);
            cellTransform.setAnchorPoint(TOP_LEFT_ANCHOR_X, TOP_LEFT_ANCHOR_Y);
            const worldPosition = mapper.cellToWorld(cellCoordinate.x, cellCoordinate.y);
            cellNode.setPosition(worldPosition.x, worldPosition.y, 0);
        }

        graphics.stroke();
    }

    private async renderImage(): Promise<void> {
        const board = this.puzzleManager?.getBoard();
        const levelData = this.puzzleManager?.getLevelData();
        if (!board || !this.boardLayer || !levelData || !this.imageRenderer) {
            return;
        }

        const boardWidth = board.getGridWidth() * levelData.gridCellSize;
        const boardHeight = board.getGridHeight() * levelData.gridCellSize;

        await this.imageRenderer.render(
            levelData.imageId,
            this.boardLayer,
            DEFAULT_BOARD_ORIGIN_WORLD_X,
            DEFAULT_BOARD_ORIGIN_WORLD_Y,
            boardWidth,
            boardHeight,
            true,
        );
    }

    private async renderPieces(): Promise<void> {
        if (!this.pieceTrayLayer || !this.puzzleManager || !this.pieceNodePool) {
            return;
        }

        const levelData = this.puzzleManager.getLevelData();
        if (!levelData) {
            return;
        }

        let sourceSpriteFrame: SpriteFrame | null = null;
        if (this.imageService) {
            try {
                sourceSpriteFrame = await this.imageService.getImage(levelData.imageId);
            } catch (error) {
                console.warn(`[PuzzleStage] Failed to load image for pieces: ${levelData.imageId}`, error);
            }
        }

        // Release all previously pooled nodes
        this.pieceNodePool.releaseAll();
        this.pieceRenderersById.clear();
        this.pieceTrayPositionsById.clear();
        this.pieceTrayLayer.removeAllChildren();

        const pieces = this.puzzleManager.getPieces();
        pieces.forEach((piece, index) => {
            // Get renderer from pool
            const pieceRenderer = this.pieceNodePool!.get();
            const pieceNode = pieceRenderer.node;
            pieceNode.name = `Piece_${piece.getId()}`;
            pieceNode.setParent(this.pieceTrayLayer);
            this.ensureTopLeftAnchor(pieceNode);
            pieceRenderer.setCellSize(levelData.gridCellSize);
            pieceRenderer.render(piece.getId(), piece.getBaseShape(), sourceSpriteFrame
            ? {
                sourceSpriteFrame,
                targetOrigin: piece.getTargetOrigin(),
                gridWidth: levelData.gridWidth,
                gridHeight: levelData.gridHeight,
            }
            : undefined);
            
            const column = index % 2;
            const row = Math.floor(index / 2);
            const trayPosition = new Vec3(
                column * DEFAULT_PIECE_TRAY_COLUMN_GAP,
                -row * DEFAULT_PIECE_TRAY_ROW_GAP,
                0,
            );
            pieceNode.setPosition(trayPosition);
            pieceNode.active = true;

            this.pieceRenderersById.set(piece.getId(), pieceRenderer);
            this.pieceTrayPositionsById.set(piece.getId(), trayPosition);
        });
    }

    private snapPieceNodeToBoard(pieceId: string): void {
        const pieceRenderer = this.pieceRenderersById.get(pieceId);
        const piece = this.puzzleManager?.getPieces().find((item) => item.getId() === pieceId);
        if (!pieceRenderer || !piece) {
            return;
        }

        const targetOrigin = piece.getTargetOrigin();
        const worldPosition = this.toWorld(targetOrigin.x, targetOrigin.y);
        pieceRenderer.node.setPosition(worldPosition);
    }

    private animatePieceToTray(pieceId: string): void {
        const pieceRenderer = this.pieceRenderersById.get(pieceId);
        const trayPosition = this.pieceTrayPositionsById.get(pieceId);
        if (!pieceRenderer || !trayPosition) {
            return;
        }

        // Animate piece back to tray with smooth easing
        tween(pieceRenderer.node)
            .to(0.3, { position: trayPosition }, { easing: 'quartInOut' })
            .start();
    }

    private bindTouchInput(): void {
        if (this.touchInputNode) {
            this.touchInputNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this, true);
            this.touchInputNode.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this, true);
            this.touchInputNode.on(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
            this.touchInputNode.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this, true);
            return;
        }

        // fallback если touchInputNode не назначена
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private unbindTouchInput(): void {
        if (this.touchInputNode) {
            this.touchInputNode.off(Node.EventType.TOUCH_START, this.onTouchStart, this, true);
            this.touchInputNode.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this, true);
            this.touchInputNode.off(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
            this.touchInputNode.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this, true);
            return;
        }

        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch): void {
        PerformanceMonitor.mark('touch-start');
        const inputManager = this.inputManager;
        if (!inputManager) {
            return;
        }

        const location = event.getUILocation();
        PerformanceMonitor.mark('hit-test-start');
        const selectedPiece = this.pickPieceAt(location.x, location.y);
        PerformanceMonitor.measure('hit-test', 'hit-test-start');
        if (!selectedPiece) {
            return;
        }

        this.activePieceId = selectedPiece.getId();
        this.pieceScrollView && (this.pieceScrollView.enabled = false);

        inputManager.beginDrag(this.activePieceId, {
            x: location.x,
            y: location.y,
        });

        const pieceRenderer = this.pieceRenderersById.get(this.activePieceId);

        if (!pieceRenderer) {
            console.warn('Piece renderer not found for piece ID:', this.activePieceId);
            
            return;
        }

        pieceRenderer.node.setParent(this.pieceLayer);
        pieceRenderer.node.setSiblingIndex(Number.MAX_SAFE_INTEGER);
    }

    private onTouchMove(event: EventTouch): void {
        const inputManager = this.inputManager;
        if (!inputManager || !this.activePieceId) {
            return;
        }

        const location = event.getUILocation();
        inputManager.updatePointer({ x: location.x, y: location.y });

        const pieceRenderer = this.pieceRenderersById.get(this.activePieceId);
        if (pieceRenderer) {
            pieceRenderer.node.setWorldPosition(location.x, location.y, 0);
        }
    }

    private onTouchEnd(): void {
        PerformanceMonitor.mark('drop-start');
        const inputManager = this.inputManager;
        if (!inputManager || !this.activePieceId) {
            this.pieceScrollView && (this.pieceScrollView.enabled = true);
            return;
        }

        const pieceId = this.activePieceId;
        const placed = inputManager.endDrag();
        PerformanceMonitor.measure('placement-check', 'drop-start');

        const pieceRenderer = this.pieceRenderersById.get(this.activePieceId);

        if (placed) {
            this.snapPieceNodeToBoard(pieceId);
        } else {
            // Placement failed - animate piece back to tray
            pieceRenderer?.node.setParent(this.pieceTrayLayer);
            this.animatePieceToTray(pieceId);
        }

        this.activePieceId = null;
        this.pieceScrollView && (this.pieceScrollView.enabled = true);
    }

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode !== KeyCode.KEY_R || !this.inputManager) {
            return;
        }

        if (this.activePieceId) {
            this.inputManager.rotatePiece(this.activePieceId);
            return;
        }

        const nextUnlocked = this.puzzleManager?.getPieces().find((piece) => !piece.isLocked());
        if (nextUnlocked) {
            this.inputManager.rotatePiece(nextUnlocked.getId());
        }
    }

    private pickPieceAt(worldX: number, worldY: number): PuzzlePiece | null {
        if (!this.puzzleManager) {
            return null;
        }

        const pieces = this.puzzleManager.getPieces().filter((piece) => !piece.isLocked());
        for (let index = pieces.length - 1; index >= 0; index -= 1) {
            const piece = pieces[index];
            const pieceRenderer = this.pieceRenderersById.get(piece.getId());
            if (!pieceRenderer) {
                continue;
            }

            const transform = pieceRenderer.node.getComponent(UITransform);
            if (!transform) {
                continue;
            }

            const worldRect = transform.getBoundingBoxToWorld();
            if (worldRect.contains(new Vec2(worldX, worldY))) {
                return piece;
            }
        }

        return null;
    }

    private toWorld(cellX: number, cellY: number): Vec3 {
        const mapper = this.createBoardMapper();
        if (!mapper) {
            return new Vec3();
        }

        const worldPosition = mapper.cellToWorld(cellX, cellY);
        return new Vec3(worldPosition.x, worldPosition.y, 0);
    }

    private createBoardMapper(): BoardCoordinateMapper | null {
        const board = this.puzzleManager?.getBoard();
        if (!board) {
            return null;
        }

        return new BoardCoordinateMapper({
            boardCenterWorldX: DEFAULT_BOARD_ORIGIN_WORLD_X,
            boardCenterWorldY: DEFAULT_BOARD_ORIGIN_WORLD_Y,
            cellSize: this.puzzleManager?.getLevelData()?.gridCellSize ?? 24,
            gridWidth: board.getGridWidth(),
            gridHeight: board.getGridHeight(),
        });
    }

    private ensureTopLeftAnchor(node: Node | null): void {
        if (!node) {
            return;
        }

        const uiTransform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        uiTransform.setAnchorPoint(TOP_LEFT_ANCHOR_X, TOP_LEFT_ANCHOR_Y);
    }
}
