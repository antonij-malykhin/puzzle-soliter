import { PuzzleManager } from '../Managers/PuzzleManager';
import { CellCoordinate } from '../Puzzle/Types';
import { BoardProjectionConfig, PointerWorldPosition } from './PointerTypes';
import { BoardCoordinateMapper } from '../Utils/BoardCoordinateMapper';

export class DragSystem {
    private readonly mapper: BoardCoordinateMapper;

    public constructor(private readonly puzzleManager: PuzzleManager) {
        this.mapper = BoardCoordinateMapper.createDefault();
    }

    public updateProjection(projection: BoardProjectionConfig): void {
        this.mapper.updateProjection(projection);
    }

    public dropPiece(pieceId: string, worldPosition: PointerWorldPosition): boolean {
        const droppedOrigin = this.toBoardCoordinate(worldPosition);
        return this.puzzleManager.tryPlacePiece(pieceId, droppedOrigin);
    }

    public toBoardCoordinate(worldPosition: PointerWorldPosition): CellCoordinate {
        return this.mapper.worldToCell(worldPosition.x, worldPosition.y);
    }
}
