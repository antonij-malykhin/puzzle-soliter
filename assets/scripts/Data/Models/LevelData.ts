import { PuzzleGameplayMode } from './PuzzleGameplayMode';

export interface LevelData {
    id: string;
    gridWidth: number;
    gridHeight: number;
    gridCellWidth: number;
    gridCellHeight: number;
    imageId: string;
    snapThreshold: number;
    minPieceSize: number;
    maxPieceSize: number;
    allowDisconnectedShapeCells?: boolean;
    gameMode?: PuzzleGameplayMode;
    pieceColumns?: number;
    pieceRows?: number;
    crossingThresholdFraction?: number;
    mergeEnabled?: boolean;
}
