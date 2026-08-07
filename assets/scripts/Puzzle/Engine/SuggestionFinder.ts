import { PuzzleBoard } from '../PuzzleBoard';
import { PuzzlePiece } from '../PuzzlePiece';
import { CellCoordinate } from '../Types';
import { MergeGroupGraph } from './MergeGroupGraph';

export interface SuggestionPair {
    readonly first: string;
    readonly second: string;
}

/**
 * Finds a pair of currently single pieces that, when swapped, would either
 * join an existing merged group or create a new merge.
 */
export class SuggestionFinder {
    public constructor(
        private readonly pieces: Map<string, PuzzlePiece>,
        private readonly board: PuzzleBoard,
        private readonly groupGraph: MergeGroupGraph,
    ) {}

    public getSuggestionPair(): SuggestionPair {
        const singlePieceIds = this.getSinglePieceIds();

        const groupJoinPair = this.findSinglePairSatisfying(singlePieceIds, (firstPieceId, secondPieceId) =>
            this.wouldSwapJoinExistingGroup(firstPieceId, secondPieceId));
        if (groupJoinPair) {
            return groupJoinPair;
        }

        const freshMergePair = this.findSinglePairSatisfying(singlePieceIds, (firstPieceId, secondPieceId) =>
            this.wouldSwapCreateMerge(firstPieceId, secondPieceId));
        if (freshMergePair) {
            return freshMergePair;
        }

        throw new Error('No suggestion pair available.');
    }

    private findSinglePairSatisfying(
        singlePieceIds: ReadonlyArray<string>,
        predicate: (firstPieceId: string, secondPieceId: string) => boolean,
    ): SuggestionPair | null {
        for (let firstIndex = 0; firstIndex < singlePieceIds.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < singlePieceIds.length; secondIndex += 1) {
                const firstPieceId = singlePieceIds[firstIndex];
                const secondPieceId = singlePieceIds[secondIndex];
                if (predicate(firstPieceId, secondPieceId)) {
                    return { first: firstPieceId, second: secondPieceId };
                }
            }
        }

        return null;
    }

    private getSinglePieceIds(): string[] {
        return Array.from(this.pieces.keys()).filter((pieceId) => this.groupGraph.getGroupPieceIds(pieceId).length === 1);
    }

    private wouldSwapCreateMerge(firstPieceId: string, secondPieceId: string): boolean {
        return this.collectSwapMergeNeighborIds(firstPieceId, secondPieceId).length > 0;
    }

    private wouldSwapJoinExistingGroup(firstPieceId: string, secondPieceId: string): boolean {
        return this.collectSwapMergeNeighborIds(firstPieceId, secondPieceId)
            .some((neighborId) => this.groupGraph.getGroupPieceIds(neighborId).length > 1);
    }

    /**
     * Temporarily swaps two pieces on the board (both must currently be single,
     * i.e. not part of any merged group, so the swap can never break an existing group),
     * collects which post-swap neighbors would satisfy the merge condition for either piece,
     * then reverts the board back to its original state before returning.
     */
    private collectSwapMergeNeighborIds(firstPieceId: string, secondPieceId: string): ReadonlyArray<string> {
        const firstPiece = this.pieces.get(firstPieceId);
        const secondPiece = this.pieces.get(secondPieceId);
        const firstOrigin = firstPiece?.getCurrentOrigin() ?? null;
        const secondOrigin = secondPiece?.getCurrentOrigin() ?? null;
        if (!firstPiece || !secondPiece || !firstOrigin || !secondOrigin) {
            return [];
        }

        const swapped = this.board.swapPlacedPieces(firstPiece, firstOrigin, secondPiece, secondOrigin);
        if (!swapped) {
            return [];
        }

        const matchingNeighborIds = [
            ...this.groupGraph.getAdjacentPieceIds(firstPieceId).filter((neighborId) =>
                this.groupGraph.shouldMergeByTargetAdjacency(firstPieceId, neighborId)),
            ...this.groupGraph.getAdjacentPieceIds(secondPieceId).filter((neighborId) =>
                this.groupGraph.shouldMergeByTargetAdjacency(secondPieceId, neighborId)),
        ];

        this.board.swapPlacedPieces(firstPiece, secondOrigin, secondPiece, firstOrigin);

        return matchingNeighborIds;
    }
}
