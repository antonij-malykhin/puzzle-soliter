import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { GameManager } from './GameManager';
import { PuzzleGenerator } from '../Generation/PuzzleGenerator';
import { PuzzleBoard } from '../Puzzle/PuzzleBoard';
import { PuzzlePiece } from '../Puzzle/PuzzlePiece';
import { CellCoordinate } from '../Puzzle/Types';
import { PuzzleValidator } from '../Validation/PuzzleValidator';
import { SnapSystem } from '../Validation/SnapSystem';
import { LevelData } from '../Data/Models/LevelData';
import { log } from 'cc';

export class PuzzleManager {
    private board: PuzzleBoard | null = null;
    private levelData: LevelData | null = null;
    private levelId: string | null = null;
    private levelStartedAtMs = 0;
    private readonly pieces = new Map<string, PuzzlePiece>();

    public constructor(
        private readonly eventBus: EventBus<GameEventMap>,
        private readonly gameManager: GameManager,
        private readonly generator: PuzzleGenerator,
        private readonly validator: PuzzleValidator,
        private readonly snapSystem: SnapSystem,
    ) {}

    public initializeLevel(levelData: LevelData): void {
        this.levelData = levelData;
        this.levelId = levelData.id;
        this.levelStartedAtMs = Date.now();
        this.board = new PuzzleBoard(levelData.gridWidth, levelData.gridHeight, this.validator);
        this.pieces.clear();

        const generatedResult = this.generator.generate({
            gridWidth: levelData.gridWidth,
            gridHeight: levelData.gridHeight,
            minPieceSize: levelData.minPieceSize,
            maxPieceSize: levelData.maxPieceSize,
            allowDisconnectedShapeCells: levelData.allowDisconnectedShapeCells,
        });

        log('PuzzleManager: Level initialized. Level ID =', levelData.id, 'Generated pieces =', generatedResult.pieces.length);
        generatedResult.pieces.forEach((definition) => {
            this.pieces.set(
                definition.id,
                new PuzzlePiece(definition.id, definition.shape, definition.targetOrigin),
            );
        });
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

    public tryPlacePiece(pieceId: string, droppedOrigin: CellCoordinate, snapThreshold: number): boolean {
        if (!this.board || !this.levelId) {
            return false;
        }

        const piece = this.pieces.get(pieceId);
        if (!piece || piece.isLocked()) {
            return false;
        }

        this.eventBus.emit('PiecePicked', { pieceId });

        const snappedOrigin = this.snapSystem.trySnapToTarget(
            droppedOrigin,
            piece.getTargetOrigin(),
            snapThreshold,
        );

        if (!snappedOrigin) {
            piece.setCurrentOrigin(droppedOrigin);
            piece.setPlaced(false);
            console.log('Not snapped origin. Dropped origin =', droppedOrigin, 'Target origin =', piece.getTargetOrigin());
            return false;
        }

        const validationResult = this.validator.validatePlacement(this.board, piece, snappedOrigin);
        if (!validationResult.isValid) {
            piece.setCurrentOrigin(droppedOrigin);
            piece.setPlaced(false);
            console.log('Invalid placement. Reason =', validationResult.reason);
            return false;
        }

        const placed = this.board.placePiece(piece, snappedOrigin);
        if (!placed) {
            console.log('Failed to place piece on the board. Piece ID =', pieceId, 'Snapped origin =', snappedOrigin);
        }

        piece.lock(snappedOrigin);
        this.eventBus.emit('PiecePlaced', {
            pieceId,
            lockedPieces: this.getLockedPieceCount(),
            totalPieces: this.pieces.size,
        });

        if (this.isSolved()) {
            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.levelStartedAtMs) / 1000));
            this.gameManager.completeLevel(this.levelId, elapsedSeconds);
        }

        return true;
    }

    public getBoard(): PuzzleBoard | null {
        return this.board;
    }

    public getLevelData(): LevelData | null {
        return this.levelData;
    }

    public getPieces(): ReadonlyArray<PuzzlePiece> {
        return [...this.pieces.values()];
    }

    private isSolved(): boolean {
        if (!this.board) {
            return false;
        }

        const everyPieceLocked = [...this.pieces.values()].every((piece) => piece.isLocked());
        const fullyOccupied = this.board.isFullyOccupied();
        return everyPieceLocked && fullyOccupied;
    }

    private getLockedPieceCount(): number {
        return [...this.pieces.values()].filter((piece) => piece.isLocked()).length;
    }
}
