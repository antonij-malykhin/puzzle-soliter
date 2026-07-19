import { CellState } from '../Core/Enums/CellState';
import { CellCoordinate } from './Types';

export class PuzzleCell {
    private state = CellState.Empty;
    private ownerPieceId: string | null = null;

    public constructor(
        private readonly coordinate: CellCoordinate,
        private readonly index: number,
    ) {}

    public getCoordinate(): CellCoordinate {
        return this.coordinate;
    }

    public getIndex(): number {
        return this.index;
    }

    public getState(): CellState {
        return this.state;
    }

    public getOwnerPieceId(): string | null {
        return this.ownerPieceId;
    }

    public occupy(pieceId: string): void {
        this.state = CellState.Occupied;
        this.ownerPieceId = pieceId;
    }

    public clear(): void {
        this.state = CellState.Empty;
        this.ownerPieceId = null;
    }
}
