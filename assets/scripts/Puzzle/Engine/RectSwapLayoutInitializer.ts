import { PuzzleBoard } from '../PuzzleBoard';
import { PuzzlePiece } from '../PuzzlePiece';
import { Shape } from '../Shape';
import { CellCoordinate } from '../Types';
import { PlacementMove } from './PlacementEngine';

/**
 * Places rectangular pieces onto the board at shuffled target origins,
 * so each footprint-sized set of pieces is distributed randomly.
 */
export class RectSwapLayoutInitializer {
    public constructor(
        private readonly pieces: Map<string, PuzzlePiece>,
        private readonly board: PuzzleBoard,
    ) {}

    public initialize(): ReadonlyArray<PlacementMove> {
        const piecesValues = Array.from(this.pieces.values());
        const allRectangles = piecesValues.every((piece) => piece.getBaseShape().isAxisAlignedRectangle());
        if (!allRectangles) {
            return [];
        }

        const piecesByFootprint = new Map<string, Array<{ piece: PuzzlePiece; origin: CellCoordinate }>>();
        piecesValues.forEach((piece) => {
            const footprintKey = this.getRectangleFootprintKey(piece.getBaseShape());
            const items = piecesByFootprint.get(footprintKey) ?? [];
            items.push({ piece, origin: piece.getTargetOrigin() });
            piecesByFootprint.set(footprintKey, items);
        });

        const placements: PlacementMove[] = [];
        piecesByFootprint.forEach((items) => {
            const shuffledOrigins = this.shuffleCoordinates(items.map((item) => item.origin));
            items.forEach((item, index) => {
                const origin = shuffledOrigins[index];
                const placed = this.board.placePiece(item.piece, origin);
                if (!placed) {
                    throw new Error(`Failed to place piece ${item.piece.getId()} during rect swap layout initialization.`);
                }

                item.piece.setCurrentOrigin(origin);
                item.piece.setPlaced(true);
                placements.push({ pieceId: item.piece.getId(), origin });
            });
        });

        return placements;
    }

    private getRectangleFootprintKey(shape: Shape): string {
        return `${shape.getBoundingWidth()}x${shape.getBoundingHeight()}`;
    }

    private shuffleCoordinates(coordinates: ReadonlyArray<CellCoordinate>): CellCoordinate[] {
        const shuffled = [...coordinates];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            const current = shuffled[index];
            shuffled[index] = shuffled[randomIndex];
            shuffled[randomIndex] = current;
        }

        return shuffled;
    }
}
