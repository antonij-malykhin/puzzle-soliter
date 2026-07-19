import { Shape } from '../Puzzle/Shape';
import { CellCoordinate, createCoordinateKey } from '../Puzzle/Types';
import { IPuzzleGenerationStrategy } from './IPuzzleGenerationStrategy';
import { GeneratedPieceDefinition, PuzzleGenerationRequest, PuzzleGenerationResult } from './GenerationTypes';

export class BacktrackingGenerationStrategy implements IPuzzleGenerationStrategy {
    private static readonly MAX_GENERATION_ATTEMPTS = 3;
    private static readonly CANDIDATES_PER_SIZE = 12;
    private request!: PuzzleGenerationRequest;
    private occupied!: boolean[][];
    private readonly selectedPieces: GeneratedPieceDefinition[] = [];

    public generate(request: PuzzleGenerationRequest): PuzzleGenerationResult {
        this.request = request;
        this.occupied = Array.from({ length: request.gridHeight }, () => Array<boolean>(request.gridWidth).fill(false));
        this.selectedPieces.length = 0;

        // Retry generation multiple times with different random seeds
        for (let attempt = 0; attempt < BacktrackingGenerationStrategy.MAX_GENERATION_ATTEMPTS; attempt += 1) {
            this.occupied = Array.from({ length: request.gridHeight }, () => Array<boolean>(request.gridWidth).fill(false));
            this.selectedPieces.length = 0;

            const generated = this.backtrack(0);
            if (generated) {
                return { pieces: [...this.selectedPieces] };
            }
        }

        // If all attempts failed, try to fill remaining cells with smallest pieces (1x1)
        this.occupied = Array.from({ length: request.gridHeight }, () => Array<boolean>(request.gridWidth).fill(false));
        this.selectedPieces.length = 0;
        
        const fallbackSuccess = this.fillRemainingWithSmallestPieces();
        if (!fallbackSuccess) {
            throw new Error('Backtracking generation and fallback strategy failed to fill the board.');
        }

        return { pieces: [...this.selectedPieces] };
    }

    private backtrack(pieceIndex: number): boolean {
        const startCell = this.findFirstEmptyCell();
        if (!startCell) {
            return true;
        }

        const candidates = this.createCandidates(startCell);
        
        // Randomize order and prioritize smaller pieces to avoid dead-ends
        const shuffledCandidates = this.shuffleAndPrioritizeCandidates(candidates);
        
        for (const candidate of shuffledCandidates) {
            this.mark(candidate, true);

            if (!this.hasValidRemainingRegions()) {
                this.mark(candidate, false);
                continue;
            }

            const normalizedShape = new Shape(candidate.map((cell: CellCoordinate) => ({
                x: cell.x - startCell.x,
                y: cell.y - startCell.y,
            })));

            this.selectedPieces.push({
                id: `piece-${pieceIndex}`,
                shape: normalizedShape,
                targetOrigin: startCell,
            });

            if (this.backtrack(pieceIndex + 1)) {
                return true;
            }

            this.selectedPieces.pop();
            this.mark(candidate, false);
        }

        return false;
    }

    private findFirstEmptyCell(): CellCoordinate | null {
        for (let y = 0; y < this.request.gridHeight; y += 1) {
            for (let x = 0; x < this.request.gridWidth; x += 1) {
                if (!this.occupied[y][x]) {
                    return { x, y };
                }
            }
        }

        return null;
    }

    private createCandidates(startCell: CellCoordinate): ReadonlyArray<ReadonlyArray<CellCoordinate>> {
        if (this.request.allowDisconnectedShapeCells) {
            return this.createDisconnectedCandidates(startCell);
        }

        return this.createConnectedCandidates(startCell);
    }

    private createConnectedCandidates(startCell: CellCoordinate): ReadonlyArray<ReadonlyArray<CellCoordinate>> {
        const maxSize = Math.max(this.request.minPieceSize, this.request.maxPieceSize);
        const minSize = Math.min(this.request.minPieceSize, this.request.maxPieceSize);
        const allCandidates: CellCoordinate[][] = [];
        const seenShapes = new Set<string>();

        const build = (cells: ReadonlyArray<CellCoordinate>, frontier: ReadonlyArray<CellCoordinate>): void => {
            if (cells.length >= minSize && cells.length <= maxSize) {
                const shapeKey = this.toShapeKey(cells, startCell);
                if (!seenShapes.has(shapeKey)) {
                    seenShapes.add(shapeKey);
                    allCandidates.push([...cells]);
                }
            }

            if (cells.length === maxSize) {
                return;
            }

            for (let index = 0; index < frontier.length; index += 1) {
                const nextCell = frontier[index];
                const nextKey = createCoordinateKey(nextCell);
                if (cells.some((cell) => createCoordinateKey(cell) === nextKey)) {
                    continue;
                }

                const extendedCells = [...cells, nextCell];
                const nextFrontier = [...frontier];
                const neighbors = this.getFreeNeighbors(nextCell);
                neighbors.forEach((neighbor) => {
                    const key = createCoordinateKey(neighbor);
                    if (!extendedCells.some((cell) => createCoordinateKey(cell) === key)
                        && !nextFrontier.some((cell) => createCoordinateKey(cell) === key)) {
                        nextFrontier.push(neighbor);
                    }
                });

                build(extendedCells, nextFrontier);
            }
        };

        build([startCell], this.getFreeNeighbors(startCell));

        return this.shuffleAndPrioritizeCandidates(allCandidates);
    }

    private createDisconnectedCandidates(startCell: CellCoordinate): ReadonlyArray<ReadonlyArray<CellCoordinate>> {
        const maxSize = Math.max(this.request.minPieceSize, this.request.maxPieceSize);
        const minSize = Math.min(this.request.minPieceSize, this.request.maxPieceSize);
        const allCandidates: CellCoordinate[][] = [];
        const seenShapes = new Set<string>();

        const freeCells = this.getAllFreeCellsExcluding(startCell);
        const maxFilledCellCount = Math.min(maxSize, freeCells.length + 1);

        for (let filledCellCount = 1; filledCellCount <= maxFilledCellCount; filledCellCount += 1) {
            const requiredAdditionalCells = filledCellCount - 1;
            const attemptCount = BacktrackingGenerationStrategy.CANDIDATES_PER_SIZE * 2;
            for (let attempt = 0; attempt < attemptCount; attempt += 1) {
                const randomCells = this.pickRandomCells(freeCells, requiredAdditionalCells);
                const candidate = [startCell, ...randomCells];
                const candidateArea = this.getBoundingArea(candidate);
                if (candidateArea < minSize || candidateArea > maxSize) {
                    continue;
                }

                const shapeKey = this.toShapeKey(candidate, startCell);
                if (seenShapes.has(shapeKey)) {
                    continue;
                }

                seenShapes.add(shapeKey);
                allCandidates.push(candidate);
            }
        }

        return this.shuffleAndPrioritizeCandidates(allCandidates);
    }

    private getBoundingArea(cells: ReadonlyArray<CellCoordinate>): number {
        const minX = Math.min(...cells.map((cell) => cell.x));
        const minY = Math.min(...cells.map((cell) => cell.y));
        const maxX = Math.max(...cells.map((cell) => cell.x));
        const maxY = Math.max(...cells.map((cell) => cell.y));

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        return width * height;
    }

    private getAllFreeCellsExcluding(excludedCell: CellCoordinate): ReadonlyArray<CellCoordinate> {
        const excludedKey = createCoordinateKey(excludedCell);
        const freeCells: CellCoordinate[] = [];

        for (let y = 0; y < this.request.gridHeight; y += 1) {
            for (let x = 0; x < this.request.gridWidth; x += 1) {
                if (this.occupied[y][x]) {
                    continue;
                }

                const coordinate: CellCoordinate = { x, y };
                if (createCoordinateKey(coordinate) === excludedKey) {
                    continue;
                }

                freeCells.push(coordinate);
            }
        }

        return freeCells;
    }

    private pickRandomCells(cells: ReadonlyArray<CellCoordinate>, count: number): ReadonlyArray<CellCoordinate> {
        const shuffled = [...cells];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            const current = shuffled[index];
            shuffled[index] = shuffled[randomIndex];
            shuffled[randomIndex] = current;
        }

        return shuffled.slice(0, count);
    }

    private getFreeNeighbors(cell: CellCoordinate): ReadonlyArray<CellCoordinate> {
        const offsets: ReadonlyArray<CellCoordinate> = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        return offsets
            .map((offset) => ({ x: cell.x + offset.x, y: cell.y + offset.y }))
            .filter((coordinate) => this.isInsideBounds(coordinate) && !this.occupied[coordinate.y][coordinate.x]);
    }

    private isInsideBounds(coordinate: CellCoordinate): boolean {
        return coordinate.x >= 0
            && coordinate.y >= 0
            && coordinate.x < this.request.gridWidth
            && coordinate.y < this.request.gridHeight;
    }

    private mark(cells: ReadonlyArray<CellCoordinate>, value: boolean): void {
        cells.forEach((cell) => {
            this.occupied[cell.y][cell.x] = value;
        });
    }

    private toShapeKey(cells: ReadonlyArray<CellCoordinate>, startCell: CellCoordinate): string {
        return cells
            .map((cell) => ({ x: cell.x - startCell.x, y: cell.y - startCell.y }))
            .sort((left, right) => (left.y - right.y) || (left.x - right.x))
            .map((cell) => `${cell.x}:${cell.y}`)
            .join('|');
    }

    private sortCandidates(candidates: ReadonlyArray<ReadonlyArray<CellCoordinate>>): ReadonlyArray<ReadonlyArray<CellCoordinate>> {
        return [...candidates].sort((left, right) => right.length - left.length);
    }

    private shuffleAndPrioritizeCandidates(
        candidates: ReadonlyArray<ReadonlyArray<CellCoordinate>>,
    ): ReadonlyArray<ReadonlyArray<CellCoordinate>> {
        // Sort by size descending (larger pieces first) to create variety
        // then randomize within same size to avoid deterministic patterns
        const sorted = [...candidates].sort((left, right) => {
            // Primary: prefer larger pieces first
            const sizeDiff = right.length - left.length;
            if (sizeDiff !== 0) {
                return sizeDiff;
            }
            // Secondary: randomize order for variety
            return Math.random() - 0.5;
        });

        return sorted;
    }

    private fillRemainingWithSmallestPieces(): boolean {
        // Find remaining empty cells and fill them with 1x1 pieces
        const emptyCell = this.findFirstEmptyCell();
        if (!emptyCell) {
            return true; // Board is complete
        }

        // Try to create 1x1 piece at empty cell
        const pieceSize = this.selectedPieces.length;
        const normalizedShape = new Shape([{ x: 0, y: 0 }]);

        this.occupied[emptyCell.y][emptyCell.x] = true;
        this.selectedPieces.push({
            id: `piece-${pieceSize}`,
            shape: normalizedShape,
            targetOrigin: emptyCell,
        });

        if (this.fillRemainingWithSmallestPieces()) {
            return true;
        }

        // Rollback
        this.selectedPieces.pop();
        this.occupied[emptyCell.y][emptyCell.x] = false;
        return false;
    }

    private hasValidRemainingRegions(): boolean {
        const minSize = Math.min(this.request.minPieceSize, this.request.maxPieceSize);
        const maxSize = Math.max(this.request.minPieceSize, this.request.maxPieceSize);

        if (this.request.allowDisconnectedShapeCells) {
            let remainingCells = 0;

            for (let y = 0; y < this.request.gridHeight; y += 1) {
                for (let x = 0; x < this.request.gridWidth; x += 1) {
                    if (!this.occupied[y][x]) {
                        remainingCells += 1;
                    }
                }
            }

            return this.isRegionFillable(remainingCells, minSize, maxSize);
        }

        const visited = Array.from({ length: this.request.gridHeight }, () => Array<boolean>(this.request.gridWidth).fill(false));

        for (let y = 0; y < this.request.gridHeight; y += 1) {
            for (let x = 0; x < this.request.gridWidth; x += 1) {
                if (this.occupied[y][x] || visited[y][x]) {
                    continue;
                }

                const regionSize = this.countRegionSize({ x, y }, visited);
                if (!this.isRegionFillable(regionSize, minSize, maxSize)) {
                    return false;
                }
            }
        }

        return true;
    }

    private countRegionSize(start: CellCoordinate, visited: boolean[][]): number {
        const stack: CellCoordinate[] = [start];
        visited[start.y][start.x] = true;
        let remainingCells = 0;

        while (stack.length > 0) {
            const cell = stack.pop();
            if (!cell) {
                continue;
            }

            remainingCells += 1;

            const neighbors = this.getFreeNeighbors(cell);
            for (const neighbor of neighbors) {
                if (!visited[neighbor.y][neighbor.x]) {
                    visited[neighbor.y][neighbor.x] = true;
                    stack.push(neighbor);
                }
            }
        }

        return remainingCells;
    }

    private isRegionFillable(regionSize: number, minSize: number, maxSize: number): boolean {
        if (regionSize === 0) {
            return true;
        }

        const reachable = Array<boolean>(regionSize + 1).fill(false);
        reachable[0] = true;

        for (let size = 1; size <= regionSize; size += 1) {
            for (let pieceSize = minSize; pieceSize <= maxSize; pieceSize += 1) {
                const previous = size - pieceSize;
                if (previous >= 0 && reachable[previous]) {
                    reachable[size] = true;
                    break;
                }
            }
        }

        return reachable[regionSize];
    }
}
