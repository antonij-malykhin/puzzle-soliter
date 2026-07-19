export interface CellCoordinate {
    readonly x: number;
    readonly y: number;
}

export interface MutableCellCoordinate {
    x: number;
    y: number;
}

export const createCoordinateKey = (coordinate: CellCoordinate): string => `${coordinate.x}:${coordinate.y}`;
