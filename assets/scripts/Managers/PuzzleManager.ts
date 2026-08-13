import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { GameManager } from './GameManager';
import { PieceFactory } from '../Generation/PieceFactory';
import { PuzzleBoard } from '../Puzzle/PuzzleBoard';
import { PuzzlePiece } from '../Puzzle/PuzzlePiece';
import { CellCoordinate } from '../Puzzle/Types';
import { PuzzleValidator } from '../Validation/PuzzleValidator';
import { LevelData } from '../Data/Models/LevelData';
import { PuzzleGameplayMode } from '../Data/Models/PuzzleGameplayMode';
import { DEFAULT_MERGE_ENABLED } from '../Core/Config/GameConstants';
import { MergeGroupGraph } from '../Puzzle/Engine/MergeGroupGraph';
import { PlacementEngine, PlacementResult } from '../Puzzle/Engine/PlacementEngine';
import { SuggestionFinder } from '../Puzzle/Engine/SuggestionFinder';
import { VictoryChecker } from '../Puzzle/Engine/VictoryChecker';
import { RectSwapLayoutInitializer } from '../Puzzle/Engine/RectSwapLayoutInitializer';

/**
 * Orchestrates a level: owns the board and pieces, delegates placement,
 * grouping, suggestion and victory logic to engine modules, and is the sole
 * publisher of puzzle-related events.
 */
export class PuzzleManager {
    private board: PuzzleBoard | null = null;
    private levelData: LevelData | null = null;
    private levelId: string | null = null;
    private levelStartedAtMs = 0;
    private readonly pieces = new Map<string, PuzzlePiece>();
    private groupGraph: MergeGroupGraph | null = null;
    private placementEngine: PlacementEngine | null = null;
    private suggestionFinder: SuggestionFinder | null = null;
    private victoryChecker: VictoryChecker | null = null;
    private disposables: Array<() => void> = [];
    private levelNumber: number = 1;

    public constructor(
        private readonly eventBus: EventBus<GameEventMap>,
        private readonly gameManager: GameManager,
        private readonly validator: PuzzleValidator,
        private readonly pieceFactory: PieceFactory,
    ) {}

    public initializeLevel(levelData: LevelData): void {
        this.levelData = levelData;
        this.levelId = levelData.id;
        this.levelNumber = levelData.levelNumber
        this.levelStartedAtMs = Date.now();

        this.disposables.forEach((dispose) => dispose());
        this.disposables = [];

        this.board = new PuzzleBoard(levelData.gridColumnCount, levelData.gridRowCount, this.validator);
        this.pieces.clear();

        const generatedPieces = this.pieceFactory.createPieces(levelData);
        generatedPieces.forEach((definition) => {
            this.pieces.set(definition.id, new PuzzlePiece(definition.id, definition.shape, definition.targetOrigin));
        });

        this.groupGraph = new MergeGroupGraph(this.pieces, this.board, this.isMergeEnabled());
        this.placementEngine = new PlacementEngine(this.pieces, this.board, this.groupGraph);
        this.suggestionFinder = new SuggestionFinder(this.pieces, this.board, this.groupGraph);
        this.victoryChecker = new VictoryChecker(this.pieces, this.groupGraph);

        if (this.isRectSwapMergeMode()) {
            const initializer = new RectSwapLayoutInitializer(this.pieces, this.board);
            const placements = initializer.initialize();
            placements.forEach((placement) => {
                this.eventBus.emit('PieceMoved', { pieceId: placement.pieceId, origin: placement.origin });
            });
        }

        this.groupGraph.rebuild();

        this.disposables.push(
            this.eventBus.on('SuggestionProvided', () => {
                const suggestionPair = this.suggestionFinder!.getSuggestionPair();
                this.eventBus.emit('SuggestionResult', {
                    firstPieceId: suggestionPair.first,
                    secondPieceId: suggestionPair.second,
                });
            }),
        );
    }

    public dispose(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables = [];
    }

    public rotatePiece(pieceId: string): void {
        const piece = this.pieces.get(pieceId);
        if (!piece || piece.isLocked()) {
            return;
        }

        piece.rotateClockwise();
        this.eventBus.emit('PieceRotated', {
            pieceId,
            rotation: piece.getCurrentRotation(),
        });
    }

    public tryPlacePiece(pieceId: string, droppedOrigin: CellCoordinate): boolean {
        if (!this.board || !this.levelId || !this.placementEngine || !this.victoryChecker) {
            return false;
        }

        const result = this.placementEngine.tryMove(pieceId, droppedOrigin);
        if (!result) {
            return false;
        }

        this.applyPlacementResult(result);

        if (result.movedPieces.length > 0 && this.victoryChecker.isSolved()) {
            this.gameManager.completeLevel(this.levelId, this.levelNumber);
        }

        return true;
    }

    public getGroupPieceIds(pieceId: string): ReadonlyArray<string> {
        return this.groupGraph?.getGroupPieceIds(pieceId) ?? [];
    }

    public getBoard(): PuzzleBoard | null {
        return this.board;
    }

    public getLevelData(): LevelData | null {
        return this.levelData;
    }

    public getPieces(): ReadonlyArray<PuzzlePiece> {
        return Array.from(this.pieces.values());
    }

    public getPiece(pieceId: string): PuzzlePiece | undefined {
        return this.pieces.get(pieceId);
    }

    private applyPlacementResult(result: PlacementResult): void {
        if (result.swappedPair) {
            this.eventBus.emit('PiecesSwapped', result.swappedPair);
        }

        result.movedPieces.forEach((move) => {
            this.eventBus.emit('PieceMoved', { pieceId: move.pieceId, origin: move.origin });
        });

        const newMergedGroups = this.groupGraph?.rebuild() ?? [];
        newMergedGroups.forEach((groupIds) => {
            this.eventBus.emit('PiecesMerged', {
                groupId: groupIds[0],
                pieceIds: [...groupIds],
            });
        });
    }

    private isRectSwapMergeMode(): boolean {
        return this.levelData?.gameMode === PuzzleGameplayMode.RectSwapMerge;
    }

    private isMergeEnabled(): boolean {
        return this.levelData?.mergeEnabled ?? DEFAULT_MERGE_ENABLED;
    }
}
