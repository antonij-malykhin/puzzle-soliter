import { CellCoordinate, createCoordinateKey } from './Types';

export class Shape {
    private readonly cells: ReadonlyArray<CellCoordinate>;

    public constructor(cells: ReadonlyArray<CellCoordinate>) {
        if (cells.length === 0) {
            throw new Error('Shape must contain at least one cell.');
        }

        this.cells = Shape.normalizeCells(cells);
    }

    public getCells(): ReadonlyArray<CellCoordinate> {
        return this.cells;
    }

    public getAnchorOffset(): CellCoordinate {
        return this.cells[0];
    }

    public getSize(): number {
        return this.cells.length;
    }

    public rotateQuarterTurns(quarterTurns: number): Shape {
        const normalizedTurns = ((quarterTurns % 4) + 4) % 4;
        if (normalizedTurns === 0) {
            return new Shape(this.cells);
        }

        let rotatedCells = [...this.cells];
        for (let turn = 0; turn < normalizedTurns; turn += 1) {
            rotatedCells = rotatedCells.map((cell) => ({
                x: -cell.y,
                y: cell.x,
            }));
        }

        return new Shape(rotatedCells);
    }

    private static normalizeCells(cells: ReadonlyArray<CellCoordinate>): ReadonlyArray<CellCoordinate> {
        const uniqueByKey = new Map<string, CellCoordinate>();
        cells.forEach((cell) => {
            uniqueByKey.set(createCoordinateKey(cell), { x: cell.x, y: cell.y });
        });

        const uniqueCells = [...uniqueByKey.values()];
        const minX = Math.min(...uniqueCells.map((cell) => cell.x));
        const minY = Math.min(...uniqueCells.map((cell) => cell.y));

        return uniqueCells
            .map((cell) => ({ x: cell.x - minX, y: cell.y - minY }))
            .sort((left, right) => (left.y - right.y) || (left.x - right.x));
    }
}
