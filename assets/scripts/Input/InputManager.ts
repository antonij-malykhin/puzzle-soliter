import { DragSystem } from './DragSystem';
import { PointerWorldPosition } from './PointerTypes';
import { RotationSystem } from './RotationSystem';

export class InputManager {
    private activePieceId: string | null = null;
    private latestPointerPosition: PointerWorldPosition | null = null;

    public constructor(
        private readonly dragSystem: DragSystem,
        private readonly rotationSystem: RotationSystem,
    ) {}

    public beginDrag(pieceId: string, pointerPosition: PointerWorldPosition): void {
        this.activePieceId = pieceId;
        this.latestPointerPosition = pointerPosition;
    }

    public updatePointer(pointerPosition: PointerWorldPosition): void {
        this.latestPointerPosition = pointerPosition;
    }

    public endDrag(): boolean {
        if (!this.activePieceId || !this.latestPointerPosition) {
            return false;
        }

        const wasPlaced = this.dragSystem.dropPiece(this.activePieceId, this.latestPointerPosition);
        this.activePieceId = null;
        this.latestPointerPosition = null;
        return wasPlaced;
    }

    public rotateActivePiece(): void {
        if (!this.activePieceId) {
            return;
        }

        this.rotationSystem.rotatePiece(this.activePieceId);
    }

    public rotatePiece(pieceId: string): void {
        this.rotationSystem.rotatePiece(pieceId);
    }
}
