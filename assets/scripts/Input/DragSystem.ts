import { PuzzleManager } from '../Managers/PuzzleManager';
import { CellCoordinate } from '../Puzzle/Types';
import { BoardProjectionConfig, PointerWorldPosition } from './PointerTypes';
import { BoardCoordinateMapper } from '../Utils/BoardCoordinateMapper';

export class DragSystem {
    private readonly mapper: BoardCoordinateMapper;

    public constructor(
        private readonly puzzleManager: PuzzleManager,
        projection: BoardProjectionConfig,
        private readonly snapThreshold: number,
    ) {
        this.mapper = new BoardCoordinateMapper({
            boardCenterWorldX: projection.originWorldX,
            boardCenterWorldY: projection.originWorldY,
            cellSize: projection.cellSize,
            gridDimentionSize: projection.gridDimentionSize,
        });
    }

    public updateProjection(projection: BoardProjectionConfig): void {
        this.mapper.updateProjection(projection);
    }

    public dropPiece(pieceId: string, worldPosition: PointerWorldPosition): boolean {
        const droppedOrigin = this.toBoardCoordinate(worldPosition);
        return this.puzzleManager.tryPlacePiece(pieceId, droppedOrigin, this.snapThreshold);
    }

    public toBoardCoordinate(worldPosition: PointerWorldPosition): CellCoordinate {
        return this.mapper.worldToCell(worldPosition.x, worldPosition.y);
    }
}
