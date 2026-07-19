import { CellCoordinate } from '../Puzzle/Types';

export interface BoardCoordinateMapperConfig {
    readonly boardCenterWorldX: number;
    readonly boardCenterWorldY: number;
    readonly cellSize: number;
    readonly gridWidth: number;
    readonly gridHeight: number;
}

export interface WorldCoordinate {
    readonly x: number;
    readonly y: number;
}

export class BoardCoordinateMapper {
    public constructor(private readonly config: BoardCoordinateMapperConfig) {}

    public getGridWidth(): number {
        return this.config.gridWidth;
    }

    public getGridHeight(): number {
        return this.config.gridHeight;
    }

    public getCellSize(): number {
        return this.config.cellSize;
    }

    public getFullWidth(): number {
        return this.config.gridWidth * this.config.cellSize;
    }

    public getFullHeight(): number {
        return this.config.gridHeight * this.config.cellSize;
    }

    public getTopLeftWorld(): WorldCoordinate {
        const halfWidth = this.getFullWidth() / 2;
        const halfHeight = this.getFullHeight() / 2;
        return {
            x: this.config.boardCenterWorldX - halfWidth,
            y: this.config.boardCenterWorldY + halfHeight,
        };
    }

    public cellToWorld(cellX: number, cellY: number): WorldCoordinate {
        const topLeft = this.getTopLeftWorld();
        return {
            x: topLeft.x + cellX * this.config.cellSize,
            y: topLeft.y - cellY * this.config.cellSize,
        };
    }

    public worldToCell(worldX: number, worldY: number): CellCoordinate {
        const topLeft = this.getTopLeftWorld();
        return {
            x: Math.round((worldX - topLeft.x) / this.config.cellSize),
            y: Math.round((topLeft.y - worldY) / this.config.cellSize),
        };
    }
}
