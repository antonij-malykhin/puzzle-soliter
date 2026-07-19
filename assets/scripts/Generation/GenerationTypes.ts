import { Shape } from '../Puzzle/Shape';
import { CellCoordinate } from '../Puzzle/Types';

export interface PuzzleGenerationRequest {
    gridWidth: number;
    gridHeight: number;
    minPieceSize: number;
    maxPieceSize: number;
    allowDisconnectedShapeCells?: boolean;
}

export interface GeneratedPieceDefinition {
    id: string;
    shape: Shape;
    targetOrigin: CellCoordinate;
}

export interface PuzzleGenerationResult {
    pieces: ReadonlyArray<GeneratedPieceDefinition>;
}
