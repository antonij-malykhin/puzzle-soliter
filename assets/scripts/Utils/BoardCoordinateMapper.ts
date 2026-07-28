import { CellCoordinate } from '../Puzzle/Types';

export interface BoardCoordinateMapperConfig {
    readonly boardCenterWorldX: number;
    readonly boardCenterWorldY: number;
    readonly cellSize: {x: number; y: number};
    readonly gridSize: {x: number; y: number};
}

export interface WorldCoordinate {
    readonly x: number;
    readonly y: number;
}

export class BoardCoordinateMapper {
    public constructor(private readonly config: BoardCoordinateMapperConfig) {}

    public getGridWidth(): number {
        return this.config.gridSize.x;
    }

    public getGridHeight(): number {
        return this.config.gridSize.y;
    }

    public getCellSize(): {x: number; y: number} {
        return this.config.cellSize;
    }

    public getFullWidth(): number {
        return this.config.gridSize.x * this.config.cellSize.x;
    }

    public getFullHeight(): number {
        return this.config.gridSize.y * this.config.cellSize.y;
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
            x: topLeft.x + cellX * this.config.cellSize.x,
            y: topLeft.y - cellY * this.config.cellSize.y,
        };
    }

    public worldToCell(worldX: number, worldY: number): CellCoordinate {
        const topLeft = this.getTopLeftWorld();
        return {
            x: Math.floor((worldX - topLeft.x) / this.config.cellSize.x),
            y: Math.floor((topLeft.y - worldY) / this.config.cellSize.y),
        };
    }
}
