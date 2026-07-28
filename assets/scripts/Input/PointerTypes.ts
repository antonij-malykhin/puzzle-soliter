export interface PointerWorldPosition {
    x: number;
    y: number;
}

export interface BoardProjectionConfig {
    originWorldX: number;
    originWorldY: number;
    cellSize: {x: number; y: number};
    gridCellSize: {x: number; y: number};
}
