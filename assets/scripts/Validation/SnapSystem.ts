import { CellCoordinate } from '../Puzzle/Types';

export class SnapSystem {
    public trySnapToTarget(
        currentOrigin: CellCoordinate,
        targetOrigin: CellCoordinate,
        thresholdInCells: number,
    ): CellCoordinate | null {
        const deltaX = currentOrigin.x - targetOrigin.x;
        const deltaY = currentOrigin.y - targetOrigin.y;
        const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));

        if (distance <= thresholdInCells) {
            return targetOrigin;
        }

        return null;
    }
}
