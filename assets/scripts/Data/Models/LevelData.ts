export interface LevelData {
    id: string;
    gridWidth: number;
    gridHeight: number;
    gridCellSize: number;
    imageId: string;
    snapThreshold: number;
    minPieceSize: number;
    maxPieceSize: number;
    allowDisconnectedShapeCells?: boolean;
}
