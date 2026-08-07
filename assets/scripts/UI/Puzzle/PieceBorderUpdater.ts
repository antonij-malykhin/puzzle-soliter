import { PuzzlePiece } from '../../Puzzle/PuzzlePiece';
import { BorderMask, PuzzleBorderRenderer } from './PuzzleBoardRender';

interface NeighborOffset {
    dx: number;
    dy: number;
    bit: BorderMask;
}

const NEIGHBOR_OFFSETS: ReadonlyArray<NeighborOffset> = [
    { dx: 0, dy: -1, bit: BorderMask.Top },
    { dx: 1, dy: 0, bit: BorderMask.Right },
    { dx: 0, dy: 1, bit: BorderMask.Bottom },
    { dx: -1, dy: 0, bit: BorderMask.Left },
];

export class PieceBorderUpdater {
    public constructor(
        private readonly getPieces: () => ReadonlyArray<PuzzlePiece>,
        private readonly renderers: ReadonlyMap<string, PuzzleBorderRenderer>,
    ) {}

    public update(pieceIds: ReadonlyArray<string>, animate = true): void {
        const pieces = this.getPieces();
        const byId = new Map<string, PuzzlePiece>();
        const byOrigin = new Map<string, PuzzlePiece>();
        pieces.forEach((piece) => {
            byId.set(piece.getId(), piece);
            const origin = piece.getCurrentOrigin();
            if (origin) {
                byOrigin.set(this.key(origin.x, origin.y), piece);
            }
        });

        pieceIds.forEach((pieceId) => {
            const piece = byId.get(pieceId);
            const renderer = this.renderers.get(pieceId);
            const origin = piece?.getCurrentOrigin();
            if (!piece || !renderer || !origin) {
                return;
            }

            let mask = BorderMask.All;
            for (const offset of NEIGHBOR_OFFSETS) {
                const neighbor = byOrigin.get(this.key(origin.x + offset.dx, origin.y + offset.dy));
                if (neighbor?.getGroupId() === piece.getGroupId()) {
                    mask &= ~offset.bit;
                }
            }

            renderer.setMask(mask, animate);
        });
    }

    private key(x: number, y: number): string {
        return `${x}:${y}`;
    }
}
