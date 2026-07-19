import { PuzzleManager } from '../Managers/PuzzleManager';

export class RotationSystem {
    public constructor(private readonly puzzleManager: PuzzleManager) {}

    public rotatePiece(pieceId: string): void {
        this.puzzleManager.rotatePiece(pieceId);
    }
}
