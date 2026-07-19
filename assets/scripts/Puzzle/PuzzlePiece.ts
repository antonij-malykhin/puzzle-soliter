import { PieceState } from '../Core/Enums/PieceState';
import { Shape } from './Shape';
import { CellCoordinate } from './Types';

export class PuzzlePiece {
    private currentOrigin: CellCoordinate | null = null;
    private currentRotation = 0;
    private state = PieceState.Free;

    public constructor(
        private readonly id: string,
        private readonly baseShape: Shape,
        private readonly targetOrigin: CellCoordinate,
        private readonly targetRotation = 0,
    ) {}

    public getId(): string {
        return this.id;
    }

    public getBaseShape(): Shape {
        return this.baseShape;
    }

    public getShapeForCurrentRotation(): Shape {
        return this.baseShape.rotateQuarterTurns(this.currentRotation);
    }

    public getCurrentOrigin(): CellCoordinate | null {
        return this.currentOrigin;
    }

    public setCurrentOrigin(origin: CellCoordinate): void {
        this.currentOrigin = origin;
    }

    public getTargetOrigin(): CellCoordinate {
        return this.targetOrigin;
    }

    public getCurrentRotation(): number {
        return this.currentRotation;
    }

    public rotateClockwise(): void {
        if (this.state === PieceState.Locked) {
            return;
        }

        this.currentRotation = (this.currentRotation + 1) % 4;
    }

    public getTargetRotation(): number {
        return this.targetRotation;
    }

    public setPlaced(isPlaced: boolean): void {
        this.state = isPlaced ? PieceState.Placed : PieceState.Free;
    }

    public lock(origin: CellCoordinate): void {
        this.currentOrigin = origin;
        this.state = PieceState.Locked;
    }

    public isLocked(): boolean {
        return this.state === PieceState.Locked;
    }

    public isPlaced(): boolean {
        return this.state === PieceState.Placed || this.state === PieceState.Locked;
    }
}
