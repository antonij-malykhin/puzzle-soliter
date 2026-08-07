import { PuzzlePiece } from '../PuzzlePiece';
import { MergeGroupGraph } from './MergeGroupGraph';

export class VictoryChecker {
    public constructor(
        private readonly pieces: Map<string, PuzzlePiece>,
        private readonly groupGraph: MergeGroupGraph,
    ) {}

    public isSolved(): boolean {
        const allPieces = Array.from(this.pieces.values());
        if (allPieces.length === 0) {
            return false;
        }

        const everyPieceAtTarget = allPieces.every((piece) => {
            const current = piece.getCurrentOrigin();
            const target = piece.getTargetOrigin();
            return current != null
                && current.x === target.x
                && current.y === target.y
                && piece.getCurrentRotation() === piece.getTargetRotation();
        });

        if (!everyPieceAtTarget) {
            return false;
        }

        const firstRoot = this.groupGraph.findGroupRoot(allPieces[0].getId());
        return allPieces.every((piece) => this.groupGraph.findGroupRoot(piece.getId()) === firstRoot);
    }
}
