import { PuzzleGameplayMode } from './PuzzleGameplayMode';

export interface LevelData {
    id: string;
    gridColumnCount: number;
    gridRowCount: number;
    gridCellWidth: number;
    gridCellHeight: number;
    imageId: string;
    snapThreshold: number;
    minPieceSize: number;
    maxPieceSize: number;
    rewardCoins: number;
    allowDisconnectedShapeCells?: boolean;
    gameMode?: PuzzleGameplayMode;
    pieceColumns?: number;
    pieceRows?: number;
    crossingThresholdFraction?: number;
    mergeEnabled?: boolean;
}
