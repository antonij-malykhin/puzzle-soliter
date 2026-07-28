import { PuzzleValidator } from '../Validation/PuzzleValidator';
import { PuzzleCell } from './PuzzleCell';
import { PuzzlePiece } from './PuzzlePiece';
import { Shape } from './Shape';
import { CellCoordinate, createCoordinateKey } from './Types';

export class PuzzleBoard {
    private readonly cells = new Map<string, PuzzleCell>();
    private readonly occupiedByPiece = new Map<string, ReadonlyArray<CellCoordinate>>();
    private readonly validator: PuzzleValidator;

    public constructor(
        private readonly gridWidth: number,
        private readonly gridHeight: number,
        validator: PuzzleValidator,
    ) {
        this.validator = validator;
        for (let y = 0; y < gridHeight; y += 1) {
            for (let x = 0; x < gridWidth; x += 1) {
                const coordinate: CellCoordinate = { x, y };
                this.cells.set(createCoordinateKey(coordinate), new PuzzleCell(coordinate, y * gridWidth + x));
            }
        }
    }

    public getGridWidth(): number {
        return this.gridWidth;
    }

    public getGridHeight(): number {
        return this.gridHeight;
    }

    public getCells(): ReadonlyArray<PuzzleCell> {
        return [...this.cells.values()];
    }

    public isInsideBounds(coordinate: CellCoordinate): boolean {
        return coordinate.x >= 0
            && coordinate.y >= 0
            && coordinate.x < this.gridWidth
            && coordinate.y < this.gridHeight;
    }

    public getCellAt(coordinate: CellCoordinate): PuzzleCell | null {
        return this.cells.get(createCoordinateKey(coordinate)) ?? null;
    }

    public placePiece(piece: PuzzlePiece, origin: CellCoordinate): boolean {
        const pieceId = piece.getId();
        const shape = piece.getShapeForCurrentRotation();

        if (!this.validator.canPlaceShapeAt(this, shape, origin, pieceId)) {
            return false;
        }

        this.removePiece(pieceId);

        const absoluteCoordinates = this.toAbsoluteCoordinates(shape, origin);
        absoluteCoordinates.forEach((coordinate) => {
            const cell = this.cells.get(createCoordinateKey(coordinate));
            cell?.occupy(pieceId);
        });

        this.occupiedByPiece.set(pieceId, absoluteCoordinates);
        return true;
    }

    public removePiece(pieceId: string): void {
        const usedCoordinates = this.occupiedByPiece.get(pieceId);
        if (!usedCoordinates) {
            return;
        }

        usedCoordinates.forEach((coordinate) => {
            const cell = this.cells.get(createCoordinateKey(coordinate));
            if (cell?.getOwnerPieceId() === pieceId) {
                cell.clear();
            }
        });

        this.occupiedByPiece.delete(pieceId);
    }

    public isFullyOccupied(): boolean {
        return this.getCells().every((cell) => cell.getOwnerPieceId() != null && cell.getOwnerPieceId() != undefined);
    }

    public toAbsoluteCoordinates(shape: Shape, origin: CellCoordinate): ReadonlyArray<CellCoordinate> {
        const anchorOffset = shape.getAnchorOffset();

        return shape.getCells().map((cell) => ({
            x: origin.x + cell.x - anchorOffset.x,
            y: origin.y + cell.y - anchorOffset.y,
        }));
    }
}
