import { DragSystem } from './DragSystem';
import { PointerWorldPosition } from './PointerTypes';
import { RotationSystem } from './RotationSystem';
import { LevelData } from '../Data/Models/LevelData';

export class InputManager {
    private activePieceId: string | null = null;
    private latestPointerPosition: PointerWorldPosition | null = null;
    
    public constructor(
        private readonly dragSystem: DragSystem,
        private readonly rotationSystem: RotationSystem,
    ) {}
    
    public setupBoardConfiguration(levelData: LevelData, boardOrigin: { x: number; y: number; }) {
        this.dragSystem.updateProjection({
            originWorldX: boardOrigin.x,
            originWorldY: boardOrigin.y,
            cellSize: { x: levelData.gridCellWidth, y: levelData.gridCellHeight },
            gridDimentionSize: { x: levelData.gridColumnCount, y: levelData.gridRowCount },
        });
    }

    public beginDrag(pieceId: string, pointerPosition: PointerWorldPosition): void {
        this.activePieceId = pieceId;
        this.latestPointerPosition = pointerPosition;
        this.dragSystem.toBoardCoordinate(pointerPosition);
    }
    
    public updatePointer(pointerPosition: PointerWorldPosition): void {
        this.latestPointerPosition = pointerPosition;
    }
    
    public endDrag(): boolean {
        if (!this.activePieceId || !this.latestPointerPosition) {
            return false;
        }

        const wasPlaced = this.dragSystem.dropPiece(this.activePieceId, this.latestPointerPosition);
        this.activePieceId = null;
        this.latestPointerPosition = null;
        return wasPlaced;
    }

    public rotateActivePiece(): void {
        if (!this.activePieceId) {
            return;
        }

        this.rotationSystem.rotatePiece(this.activePieceId);
    }

    public rotatePiece(pieceId: string): void {
        this.rotationSystem.rotatePiece(pieceId);
    }
}
