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
                this.cells.set(createCoordinateKey(coordinate), new PuzzleCell(coordinate));
            }
        }
    }

    public getGridWidth(): number {
        return this.gridWidth;
    }

    public getGridHeight(): number {
        return this.gridHeight;
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

    public getPieceIdAt(coordinate: CellCoordinate): string | null {
        return this.getCellAt(coordinate)?.getOwnerPieceId() ?? null;
    }

    public getOccupiedCoordinates(pieceId: string): ReadonlyArray<CellCoordinate> {
        return this.occupiedByPiece.get(pieceId) ?? [];
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

    public toAbsoluteCoordinates(shape: Shape, origin: CellCoordinate): ReadonlyArray<CellCoordinate> {
        const anchorOffset = shape.getAnchorOffset();

        return shape.getCells().map((cell) => ({
            x: origin.x + cell.x - anchorOffset.x,
            y: origin.y + cell.y - anchorOffset.y,
        }));
    }

    public canPlaceShapeAtWithIgnoredPieces(
        shape: Shape,
        origin: CellCoordinate,
        ignoredPieceIds: ReadonlySet<string>,
    ): boolean {
        const absoluteCoordinates = this.toAbsoluteCoordinates(shape, origin);
        return absoluteCoordinates.every((coordinate) => {
            if (!this.isInsideBounds(coordinate)) {
                return false;
            }

            const ownerPieceId = this.getPieceIdAt(coordinate);
            return ownerPieceId == null || ignoredPieceIds.has(ownerPieceId);
        });
    }

    public swapPlacedPieces(
        firstPiece: PuzzlePiece,
        firstOrigin: CellCoordinate,
        secondPiece: PuzzlePiece,
        secondOrigin: CellCoordinate,
    ): boolean {
        const ignoredIds = new Set<string>([firstPiece.getId(), secondPiece.getId()]);
        const canPlaceFirst = this.canPlaceShapeAtWithIgnoredPieces(
            firstPiece.getShapeForCurrentRotation(),
            secondOrigin,
            ignoredIds,
        );
        const canPlaceSecond = this.canPlaceShapeAtWithIgnoredPieces(
            secondPiece.getShapeForCurrentRotation(),
            firstOrigin,
            ignoredIds,
        );

        if (!canPlaceFirst || !canPlaceSecond) {
            return false;
        }

        this.removePiece(firstPiece.getId());
        this.removePiece(secondPiece.getId());

        const firstPlaced = this.placePiece(firstPiece, secondOrigin);
        const secondPlaced = this.placePiece(secondPiece, firstOrigin);
        if (firstPlaced && secondPlaced) {
            return true;
        }

        if (firstPlaced) {
            this.removePiece(firstPiece.getId());
        }
        if (secondPlaced) {
            this.removePiece(secondPiece.getId());
        }

        this.placePiece(firstPiece, firstOrigin);
        this.placePiece(secondPiece, secondOrigin);
        return false;
    }
}
