import { GeneratedPieceDefinition, PuzzleGenerationRequest } from './GenerationTypes';
import { PuzzleGenerator } from './PuzzleGenerator';
import { LevelData } from '../Data/Models/LevelData';
import { PuzzleGameplayMode } from '../Data/Models/PuzzleGameplayMode';

/**
 * Builds the piece definitions for a level, delegating to the generator
 * that picks the strategy matching the level's gameplay mode.
 */
export class PieceFactory {
    public constructor(private readonly generator: PuzzleGenerator) {}

    public createPieces(levelData: LevelData): ReadonlyArray<GeneratedPieceDefinition> {
        const mode = levelData.gameMode ?? PuzzleGameplayMode.RectSwapMerge;
        const request: PuzzleGenerationRequest = {
            gridWidth: levelData.gridColumnCount,
            gridHeight: levelData.gridRowCount,
            minPieceSize: levelData.minPieceSize,
            maxPieceSize: levelData.maxPieceSize,
            allowDisconnectedShapeCells: levelData.allowDisconnectedShapeCells,
            pieceColumns: levelData.pieceColumns,
            pieceRows: levelData.pieceRows,
        };

        return [...this.generator.generate(request, mode).pieces];
    }
}
