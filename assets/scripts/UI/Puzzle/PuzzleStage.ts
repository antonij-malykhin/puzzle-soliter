import {
    _decorator,
    Component,
    Node,
    Prefab,
    ScrollView,
    SpriteFrame,
    Tween,
    UITransform,
    Vec2,
    Vec3,
    tween,
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
import { PuzzleGameplayMode } from '../../Data/Models/PuzzleGameplayMode';
import { PieceRenderer } from './PieceRenderer';
import { BorderMask, PuzzleBorderRenderer } from './PuzzleBoardRender';
import { ImageBoardRenderer } from '../ImageBoardRenderer';
import { ImageService } from '../../Services/ImageService';
import { PieceNodePool } from '../../Utils/PieceNodePool';
import { BoardCoordinateMapper } from '../../Utils/BoardCoordinateMapper';
import { SpriteFrameSliceService } from '../../Services/SpriteFrameSliceService';
import { PieceBorderUpdater } from './PieceBorderUpdater';
import { PuzzleTouchInput } from './PuzzleTouchInput';

const { ccclass, property } = _decorator;
const TOP_LEFT_ANCHOR_X = 0;
const TOP_LEFT_ANCHOR_Y = 1;

@ccclass('PuzzleStage')
export class PuzzleStage extends Component {
    private readonly pieceRenderersById = new Map<string, PieceRenderer>();
    private readonly pieceTrayPositionsById = new Map<string, Vec3>();
    private readonly boardBorderRenderersByPieceId = new Map<string, PuzzleBorderRenderer>();
    private readonly disposables: Array<() => void> = [];

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
    private boardCoordinateMapper: BoardCoordinateMapper | null = null;
    private borderUpdater: PieceBorderUpdater | null = null;
    private touchInput: PuzzleTouchInput | null = null;
    private spriteFrameSliceService!: SpriteFrameSliceService;

    @property(Node)
    private touchInputNode: Node | null = null;

    @property(ScrollView)
    private pieceScrollView: ScrollView | null = null;

    private suggestionTween: Tween<Node>[] = [];
    private suggestedPieceNodes: Node[] = [];

    public initialize(
        puzzleManager: PuzzleManager,
        inputManager: InputManager,
        eventBus: EventBus<GameEventMap>,
        imageService: ImageService,
        spriteFrameSliceService: SpriteFrameSliceService
    ): void {
        this.dispose();

        this.inputManager = inputManager;
        this.puzzleManager = puzzleManager;
        this.imageService = imageService;
        this.spriteFrameSliceService = spriteFrameSliceService;
        this.imageRenderer = new ImageBoardRenderer(imageService);
        this.pieceNodePool = new PieceNodePool(32, this.piecePrefab);
        this.ensureLayers();

        this.boardCoordinateMapper = this.createBoardMapper();
        this.borderUpdater = new PieceBorderUpdater(
            () => this.puzzleManager?.getPieces() ?? [],
            this.boardBorderRenderersByPieceId,
        );
        this.touchInput = new PuzzleTouchInput({
            inputManager,
            puzzleManager,
            pieceLayer: this.pieceLayer,
            pieceTrayLayer: this.pieceTrayLayer,
            pieceScrollView: this.pieceScrollView,
            getRenderers: () => this.pieceRenderersById,
            pickPieceAt: (worldX, worldY) => this.pickPieceAt(worldX, worldY),
            stopSuggestionAnimation: () => this.stopSuggestionAnimation(),
            isRectSwapMergeMode: () => this.isRectSwapMergeMode(),
            snapPieceToBoard: (pieceId) => this.snapPieceNodeToBoard(pieceId),
            snapGroupToCurrentOrigin: (pieceIds) => this.snapGroupNodesToCurrentOrigin(pieceIds),
            snapPieceToTrayAndAnimate: (pieceId) => this.snapPieceToTrayAndAnimate(pieceId),
        });
        this.touchInput.bind(this.touchInputNode);

        void this.renderImage();
        void this.renderPieces();

        this.disposables.push(eventBus.on('PiecePlaced', ({ pieceId }) => {
            this.stopSuggestionAnimation();
            this.snapPieceNodeToBoard(pieceId);
        }));

        this.disposables.push(eventBus.on('PieceMoved', ({ pieceId, origin }) => {
            this.stopSuggestionAnimation();
            this.snapPieceNodeToOrigin(pieceId, origin.x, origin.y);
        }));

        this.disposables.push(eventBus.on('SuggestionResult', ({ firstPieceId, secondPieceId }) => {
            this.animateSuggestedPieces(firstPieceId, secondPieceId);
        }));

        this.disposables.push(eventBus.on('PieceRotated', ({ pieceId, rotation }) => {
            const pieceRenderer = this.pieceRenderersById.get(pieceId);
            if (pieceRenderer) {
                pieceRenderer.node.setRotationFromEuler(0, 0, -rotation * 90);
            }
        }));

        this.disposables.push(eventBus.on('PiecesMerged', ({ pieceIds }) => {
            this.stopSuggestionAnimation();
            this.animateMergedPieces(pieceIds);
            this.borderUpdater?.update(pieceIds);
        }));

        this.disposables.push(eventBus.on('LevelLoaded', () => {
            this.borderUpdater?.update(this.puzzleManager?.getPieces().map((piece) => piece.getId()) ?? []);
        }));
    }

    public dispose(): void {
        this.stopSuggestionAnimation();
        this.disposables.forEach((dispose) => dispose());
        this.disposables.length = 0;

        this.touchInput?.unbind(this.touchInputNode);
        this.touchInput = null;

        this.imageRenderer?.cleanup();
        this.pieceNodePool?.clear();
        this.pieceRenderersById.clear();
        this.pieceTrayPositionsById.clear();
        this.boardBorderRenderersByPieceId.clear();

        this.imageService = null;
        this.boardCoordinateMapper = null;
        this.borderUpdater = null;
    }

    protected onDestroy(): void {
        this.dispose();
    }

    public stopSuggestionAnimation(): void {
        if (this.suggestionTween.length > 0) {
            this.suggestionTween.forEach((t) => t?.stop());
            this.suggestionTween.length = 0;
        }


        if (this.suggestedPieceNodes.length > 0) {
            this.suggestedPieceNodes.forEach((node) => {
                if (node && node.isValid) {
                    node.setScale(1, 1, 1);
                }
            });
            this.suggestedPieceNodes.length = 0;
        }
    }

    public animateSuggestedPieces(firstPieceId: string, secondPieceId: string): void {
        this.stopSuggestionAnimation();

        const pieceIds = Array.from(new Set([firstPieceId, secondPieceId].filter(Boolean)));
        for (const pieceId of pieceIds) {
            const renderer = this.pieceRenderersById.get(pieceId);
            if (!renderer || !renderer.node || !renderer.node.isValid) {
                continue;
            }

            this.suggestedPieceNodes.push(renderer.node);
            this.suggestionTween.push(
                tween(renderer.node)
                    .to(0.4, { scale: new Vec3(1.2, 1.2, 1.2) })
                    .to(0.4, { scale: new Vec3(1, 1, 1) })
                    .union()
                    .repeatForever()
                    .start()
            );
        }
    }

    private ensureLayers(): void {
        if (!this.pieceTrayLayer) {
            this.pieceTrayLayer = new Node('PieceTrayLayer');
            this.pieceTrayLayer.setParent(this.node);
        }
        if (!this.pieceLayer) {
            this.pieceLayer = new Node('PieceLayer');
            this.pieceLayer.setParent(this.node);
        }

        this.ensureTopLeftAnchor(this.pieceTrayLayer);
    }

    private async renderImage(): Promise<void> {
        const levelData = this.puzzleManager?.getLevelData();
        if (!levelData || !this.imageRenderer) {
            return;
        }

        const boardWidth = levelData.gridColumnCount * levelData.gridCellWidth;
        const boardHeight = levelData.gridRowCount * levelData.gridCellHeight;

        await this.imageRenderer.render(
            levelData.imageId,
            this.pieceLayer!,
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
                sourceSpriteFrame = await this.imageService.getImageById(levelData.imageId);
            } catch (error) {
                console.warn(`[PuzzleStage] Failed to load image for pieces: ${levelData.imageId}`, error);
            }
        }

        this.pieceNodePool.releaseAll();
        this.pieceRenderersById.clear();
        this.pieceTrayPositionsById.clear();
        this.pieceTrayLayer.removeAllChildren();

        const pieces = this.puzzleManager.getPieces();
        pieces.forEach((piece, index) => {
            const pieceRenderer = this.pieceNodePool!.get();
            const pieceNode = pieceRenderer.node;
            pieceNode.name = `Piece_${piece.getId()}`;
            pieceNode.setParent(this.pieceTrayLayer);
            this.ensureTopLeftAnchor(pieceNode);
            pieceRenderer.initialize(this.spriteFrameSliceService);
            pieceRenderer.setCellSize({ x: levelData.gridCellWidth, y: levelData.gridCellHeight });
            pieceRenderer.render(piece.getId(), piece.getBaseShape(), sourceSpriteFrame
                ? {
                    sourceSpriteFrame,
                    targetOrigin: piece.getTargetOrigin(),
                    gridWidth: levelData.gridColumnCount,
                    gridHeight: levelData.gridRowCount,
                }
                : undefined);

            const borderRenderer = pieceNode.getComponentInChildren(PuzzleBorderRenderer)!;
            borderRenderer.initialize(piece.getId(), levelData.gridCellWidth, levelData.gridCellHeight);
            borderRenderer.setMask(BorderMask.All, false);
            this.boardBorderRenderersByPieceId.set(piece.getId(), borderRenderer);

            const trayPosition = this.getTrayPosition(index);
            if (this.isRectSwapMergeMode()) {
                const currentOrigin = piece.getCurrentOrigin() ?? piece.getTargetOrigin();
                const worldPosition = this.toWorld(currentOrigin.x, currentOrigin.y);
                pieceNode.setParent(this.pieceLayer);
                pieceNode.setPosition(worldPosition);
            } else {
                pieceNode.setPosition(trayPosition);
            }
            pieceNode.active = true;

            this.pieceRenderersById.set(piece.getId(), pieceRenderer);
            this.pieceTrayPositionsById.set(piece.getId(), trayPosition);
        });
    }

    private snapPieceNodeToBoard(pieceId: string): void {
        const pieceRenderer = this.pieceRenderersById.get(pieceId);
        const piece = this.puzzleManager?.getPiece(pieceId);
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

        tween(pieceRenderer.node)
            .to(0.3, { position: trayPosition }, { easing: 'quartInOut' })
            .start();
    }

    private snapPieceNodeToOrigin(pieceId: string, cellX: number, cellY: number): void {
        const pieceRenderer = this.pieceRenderersById.get(pieceId);
        if (!pieceRenderer) {
            return;
        }

        const worldPosition = this.toWorld(cellX, cellY);
        pieceRenderer.node.setParent(this.pieceLayer);
        pieceRenderer.node.setPosition(worldPosition);
    }

    private getTrayPosition(index: number): Vec3 {
        const column = index % 2;
        const row = Math.floor(index / 2);
        return new Vec3(
            column * DEFAULT_PIECE_TRAY_COLUMN_GAP,
            -row * DEFAULT_PIECE_TRAY_ROW_GAP,
            0,
        );
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
        const mapper = this.boardCoordinateMapper;
        if (!mapper) {
            return new Vec3();
        }

        const worldPosition = mapper.cellToWorld(cellX, cellY);
        return new Vec3(worldPosition.x, worldPosition.y, 0);
    }

    private createBoardMapper(): BoardCoordinateMapper | null {
        const board = this.puzzleManager?.getBoard();
        const levelData = this.puzzleManager?.getLevelData();
        if (!board || !levelData) {
            return null;
        }

        return new BoardCoordinateMapper({
            boardCenterWorldX: DEFAULT_BOARD_ORIGIN_WORLD_X,
            boardCenterWorldY: DEFAULT_BOARD_ORIGIN_WORLD_Y,
            cellSize: {
                x: levelData.gridCellWidth,
                y: levelData.gridCellHeight,
            },
            gridDimentionSize: {
                x: board.getGridWidth(),
                y: board.getGridHeight(),
            },
        });
    }

    private ensureTopLeftAnchor(node: Node | null): void {
        if (!node) {
            return;
        }

        const uiTransform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        uiTransform.setAnchorPoint(TOP_LEFT_ANCHOR_X, TOP_LEFT_ANCHOR_Y);
    }

    private snapPieceNodeToCurrentOrigin(pieceId: string): void {
        const piece = this.puzzleManager?.getPiece(pieceId);
        if (!piece) {
            return;
        }

        const origin = piece.getCurrentOrigin() ?? piece.getTargetOrigin();
        this.snapPieceNodeToOrigin(pieceId, origin.x, origin.y);
    }

    private snapGroupNodesToCurrentOrigin(pieceIds: ReadonlyArray<string>): void {
        pieceIds.forEach((pieceId) => this.snapPieceNodeToCurrentOrigin(pieceId));
    }

    private snapPieceToTrayAndAnimate(pieceId: string): void {
        const pieceRenderer = this.pieceRenderersById.get(pieceId);
        if (!pieceRenderer) {
            return;
        }

        pieceRenderer.node.setParent(this.pieceTrayLayer);
        this.animatePieceToTray(pieceId);
    }

    private isRectSwapMergeMode(): boolean {
        return this.puzzleManager?.getLevelData()?.gameMode === PuzzleGameplayMode.RectSwapMerge;
    }

    private animateMergedPieces(pieceIds: ReadonlyArray<string>): void {
        pieceIds.forEach((pieceId) => {
            const renderer = this.pieceRenderersById.get(pieceId);
            if (!renderer) {
                return;
            }

            const node = renderer.node;
            tween(node)
                .to(0.08, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'quadOut' })
                .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'quadIn' })
                .start();
        });
    }
}
