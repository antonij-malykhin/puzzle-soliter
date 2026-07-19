import { PuzzleBoard } from '../Puzzle/PuzzleBoard';
import { PuzzlePiece } from '../Puzzle/PuzzlePiece';
import { Shape } from '../Puzzle/Shape';
import { CellCoordinate } from '../Puzzle/Types';

export interface PlacementValidationResult {
    pieceId: string;
    isValid: boolean;
    reason: string | null;
}

export class PuzzleValidator {
    private cachedResult: PlacementValidationResult | null = null;
    /**
     * Валидирует установку пазла.
     * Геометрическая корректность (границы, перекрытия) гарантируется генератором
     * и является ответственностью PuzzleBoard.placePiece.
     * Здесь проверяется только правильность вращения.
     */
    public validatePlacement(board: PuzzleBoard, piece: PuzzlePiece, snappedOrigin: CellCoordinate): PlacementValidationResult {
        if (piece.getCurrentRotation() !== piece.getTargetRotation()) {
            this.cachedResult = { pieceId: piece.getId(), isValid: false, reason: 'Piece rotation does not match target rotation.' };
            return this.cachedResult;
        }

        if (!this.canPlaceShapeAt(board, piece.getShapeForCurrentRotation(), snappedOrigin, piece.getId())) {
            this.cachedResult = { pieceId: piece.getId(), isValid: false, reason: 'Piece cannot be placed at the snapped origin.' };
            return this.cachedResult;
        }

        this.cachedResult = { pieceId: piece.getId(), isValid: true, reason: null };
        return this.cachedResult;
    }

    public canPlaceShapeAt(board: PuzzleBoard, shape: Shape, origin: CellCoordinate, pieceId: string): boolean {
        if (this.cachedResult && this.cachedResult.pieceId === pieceId && this.cachedResult.isValid) {
            return this.cachedResult.isValid;
        }

        const absoluteCoordinates = board.toAbsoluteCoordinates(shape, origin);
        return absoluteCoordinates.every((coordinate) => {
            if (!board.isInsideBounds(coordinate)) {
                return false;
            }

            const cell = board.getCellAt(coordinate);
            const ownerPieceId = cell?.getOwnerPieceId() ?? null;
            return !ownerPieceId || ownerPieceId === pieceId;
        });
    }
}
