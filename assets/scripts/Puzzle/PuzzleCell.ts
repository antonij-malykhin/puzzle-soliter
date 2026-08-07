import { CellCoordinate } from './Types';

export class PuzzleCell {
    private ownerPieceId: string | null = null;

    public constructor(private readonly coordinate: CellCoordinate) {}

    public getCoordinate(): CellCoordinate {
        return this.coordinate;
    }

    public getOwnerPieceId(): string | null {
        return this.ownerPieceId;
    }

    public occupy(pieceId: string): void {
        this.ownerPieceId = pieceId;
    }

    public clear(): void {
        this.ownerPieceId = null;
    }
}
