import { Shape } from '../Puzzle/Shape';
import { CellCoordinate } from '../Puzzle/Types';
import { IPuzzleGenerationStrategy } from './IPuzzleGenerationStrategy';
import { GeneratedPieceDefinition, PuzzleGenerationRequest, PuzzleGenerationResult } from './GenerationTypes';

/**
 * Generates a regular grid of axis-aligned rectangular pieces.
 * Used by the RectSwapMerge gameplay mode where pieces are shuffled
 * and swapped until the image is reassembled.
 */
export class RectSwapGenerationStrategy implements IPuzzleGenerationStrategy {
    public generate(request: PuzzleGenerationRequest): PuzzleGenerationResult {
        const { gridWidth, gridHeight, pieceColumns, pieceRows } = request;
        if (!pieceColumns || !pieceRows || pieceColumns <= 0 || pieceRows <= 0) {
            throw new Error('rectSwapMerge mode requires positive pieceColumns and pieceRows in level data.');
        }

        if ((gridWidth % pieceColumns) !== 0 || (gridHeight % pieceRows) !== 0) {
            throw new Error(
                `Grid ${gridWidth}x${gridHeight} cannot be evenly sliced into ${pieceColumns}x${pieceRows} pieces.`,
            );
        }

        const pieceWidth = gridWidth / pieceColumns;
        const pieceHeight = gridHeight / pieceRows;
        const definitions: GeneratedPieceDefinition[] = [];
        let pieceIndex = 0;
        for (let pieceRow = 0; pieceRow < pieceRows; pieceRow += 1) {
            for (let pieceColumn = 0; pieceColumn < pieceColumns; pieceColumn += 1) {
                const originX = pieceColumn * pieceWidth;
                const originY = pieceRow * pieceHeight;

                const cells: CellCoordinate[] = [];
                for (let localY = 0; localY < pieceHeight; localY += 1) {
                    for (let localX = 0; localX < pieceWidth; localX += 1) {
                        cells.push({ x: localX, y: localY });
                    }
                }

                definitions.push({
                    id: `piece-${pieceIndex}`,
                    shape: new Shape(cells),
                    targetOrigin: { x: originX, y: originY },
                });
                pieceIndex += 1;
            }
        }

        return { pieces: definitions };
    }
}
