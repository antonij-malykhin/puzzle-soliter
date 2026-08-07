import { PuzzleBoard } from '../PuzzleBoard';
import { PuzzlePiece } from '../PuzzlePiece';
import { CellCoordinate } from '../Types';
import { MergeGroupGraph } from './MergeGroupGraph';

export interface PlacementMove {
    readonly pieceId: string;
    readonly origin: CellCoordinate;
}

export interface PlacementSwapPair {
    readonly firstPieceId: string;
    readonly firstOrigin: CellCoordinate;
    readonly secondPieceId: string;
    readonly secondOrigin: CellCoordinate;
}

export interface PlacementResult {
    readonly movedPieces: ReadonlyArray<PlacementMove>;
    readonly swappedPair: PlacementSwapPair | null;
}

/**
 * Mutates the board and pieces when a piece (or merged group) is dropped.
 * Returns a pure description of what changed so the caller can emit events.
 */
export class PlacementEngine {
    public constructor(
        private readonly pieces: Map<string, PuzzlePiece>,
        private readonly board: PuzzleBoard,
        private readonly groupGraph: MergeGroupGraph,
    ) {}

    public tryMove(pieceId: string, droppedOrigin: CellCoordinate): PlacementResult | null {
        const movingPiece = this.pieces.get(pieceId);
        if (!movingPiece) {
            return null;
        }

        const movingGroupPieceIds = this.groupGraph.getGroupPieceIds(pieceId);
        if (movingGroupPieceIds.length > 1) {
            return this.tryMoveMergedGroup(pieceId, droppedOrigin, movingGroupPieceIds);
        }

        return this.trySwapSingle(pieceId, droppedOrigin);
    }

    private trySwapSingle(pieceId: string, droppedOrigin: CellCoordinate): PlacementResult | null {
        const occupantPieceId = this.board.getPieceIdAt(droppedOrigin);
        if (!occupantPieceId) {
            return null;
        }

        if (occupantPieceId === pieceId) {
            return { movedPieces: [], swappedPair: null };
        }

        const movingPiece = this.pieces.get(pieceId);
        const occupantPiece = this.pieces.get(occupantPieceId);
        const movingOrigin = movingPiece?.getCurrentOrigin() ?? null;
        const occupantOrigin = occupantPiece?.getCurrentOrigin() ?? null;
        if (!movingPiece || !occupantPiece || !movingOrigin || !occupantOrigin) {
            return null;
        }

        const moved = this.board.swapPlacedPieces(movingPiece, movingOrigin, occupantPiece, occupantOrigin);
        if (!moved) {
            return null;
        }

        movingPiece.setCurrentOrigin(occupantOrigin);
        occupantPiece.setCurrentOrigin(movingOrigin);
        movingPiece.setPlaced(true);
        occupantPiece.setPlaced(true);

        return {
            movedPieces: [
                { pieceId: movingPiece.getId(), origin: occupantOrigin },
                { pieceId: occupantPiece.getId(), origin: movingOrigin },
            ],
            swappedPair: {
                firstPieceId: movingPiece.getId(),
                firstOrigin: occupantOrigin,
                secondPieceId: occupantPiece.getId(),
                secondOrigin: movingOrigin,
            },
        };
    }

    private tryMoveMergedGroup(
        anchorPieceId: string,
        droppedOrigin: CellCoordinate,
        groupPieceIds: ReadonlyArray<string>,
    ): PlacementResult | null {
        const anchorPiece = this.pieces.get(anchorPieceId);
        const anchorOrigin = anchorPiece?.getCurrentOrigin() ?? null;
        if (!anchorPiece || !anchorOrigin) {
            return null;
        }

        const step = this.getMovementStep(anchorOrigin, droppedOrigin);
        if (step.x === 0 && step.y === 0) {
            return null;
        }

        const groupSet = new Set<string>(groupPieceIds);
        const groupOrigins = new Map<string, CellCoordinate>();
        groupPieceIds.forEach((id) => {
            const origin = this.pieces.get(id)?.getCurrentOrigin();
            if (origin) {
                groupOrigins.set(id, origin);
            }
        });

        if (groupOrigins.size !== groupPieceIds.length) {
            return null;
        }

        const targetByPieceId = new Map<string, CellCoordinate>();
        const enteringExternalPieceIds = new Set<string>();

        for (const [pieceId, origin] of groupOrigins.entries()) {
            const target: CellCoordinate = { x: origin.x + step.x, y: origin.y + step.y };
            targetByPieceId.set(pieceId, target);

            const piece = this.pieces.get(pieceId);
            if (!piece) {
                return null;
            }

            const targetCells = this.board.toAbsoluteCoordinates(piece.getShapeForCurrentRotation(), target);
            for (const cell of targetCells) {
                if (!this.board.isInsideBounds(cell)) {
                    return null;
                }

                const occupantId = this.board.getPieceIdAt(cell);
                if (!occupantId || groupSet.has(occupantId)) {
                    continue;
                }

                enteringExternalPieceIds.add(occupantId);
            }
        }

        const relocationPlan = this.buildRelocationPlanForGroupMove(
            groupPieceIds,
            targetByPieceId,
            enteringExternalPieceIds,
            step,
        );
        if (!relocationPlan) {
            return null;
        }

        const movingPieceIds = Array.from(relocationPlan.keys());
        const allOriginsByPieceId = new Map<string, CellCoordinate>();
        movingPieceIds.forEach((id) => {
            const origin = this.pieces.get(id)?.getCurrentOrigin();
            if (origin) {
                allOriginsByPieceId.set(id, origin);
            }
        });

        if (allOriginsByPieceId.size !== movingPieceIds.length) {
            return null;
        }

        movingPieceIds.forEach((id) => this.board.removePiece(id));

        const placedAll = Array.from(relocationPlan.entries()).every(([id, target]) => {
            const piece = this.pieces.get(id);
            return piece ? this.board.placePiece(piece, target) : false;
        });

        if (!placedAll) {
            movingPieceIds.forEach((id) => this.board.removePiece(id));
            allOriginsByPieceId.forEach((origin, id) => {
                const piece = this.pieces.get(id);
                if (piece) {
                    this.board.placePiece(piece, origin);
                }
            });
            return null;
        }

        const movedPieces: PlacementMove[] = [];
        Array.from(relocationPlan.entries()).forEach(([id, target]) => {
            const piece = this.pieces.get(id);
            piece?.setCurrentOrigin(target);
            piece?.setPlaced(true);
            movedPieces.push({ pieceId: id, origin: target });
        });

        return { movedPieces, swappedPair: null };
    }

    private buildRelocationPlanForGroupMove(
        movingGroupPieceIds: ReadonlyArray<string>,
        movingTargets: ReadonlyMap<string, CellCoordinate>,
        enteringExternalPieceIds: ReadonlySet<string>,
        step: CellCoordinate,
    ): Map<string, CellCoordinate> | null {
        const displacedGroups = this.collectDisplacedGroups(enteringExternalPieceIds, new Set<string>(movingGroupPieceIds));
        const displacedPieceIds = displacedGroups.reduce((accumulator: string[], group) => {
            accumulator.push(...group);
            return accumulator;
        }, []);
        const relocationPlan = new Map<string, CellCoordinate>(movingTargets);

        const occupiedCells = this.collectOccupiedCellsExcluding(new Set<string>([
            ...movingGroupPieceIds,
            ...displacedPieceIds,
        ]));

        if (!this.tryReservePlannedPlacements(relocationPlan, occupiedCells)) {
            return null;
        }

        for (const displacedGroup of displacedGroups) {
            const translatedGroupPlan = new Map<string, CellCoordinate>();
            for (const pieceId of displacedGroup) {
                const currentOrigin = this.pieces.get(pieceId)?.getCurrentOrigin() ?? null;
                if (!currentOrigin) {
                    return null;
                }

                translatedGroupPlan.set(pieceId, {
                    x: currentOrigin.x - step.x,
                    y: currentOrigin.y - step.y,
                });
            }

            if (this.tryReservePlannedPlacements(translatedGroupPlan, occupiedCells)) {
                translatedGroupPlan.forEach((origin, id) => relocationPlan.set(id, origin));
                continue;
            }

            // Keep-shape failed: split group and move each piece independently to free cells.
            for (const pieceId of displacedGroup) {
                const piece = this.pieces.get(pieceId);
                if (!piece) {
                    return null;
                }

                const fallbackOrigin = this.findFirstAvailableOrigin(piece, occupiedCells);
                if (!fallbackOrigin) {
                    return null;
                }

                if (!this.reservePieceCells(piece, fallbackOrigin, occupiedCells)) {
                    return null;
                }

                relocationPlan.set(pieceId, fallbackOrigin);
            }
        }

        return relocationPlan;
    }

    private collectDisplacedGroups(
        enteringExternalPieceIds: ReadonlySet<string>,
        movingGroupSet: ReadonlySet<string>,
    ): string[][] {
        const seenRoots = new Set<string>();
        const groups: string[][] = [];

        enteringExternalPieceIds.forEach((pieceId) => {
            const root = this.groupGraph.findGroupRoot(pieceId);
            if (seenRoots.has(root)) {
                return;
            }

            const group = this.groupGraph.getGroupPieceIds(pieceId).filter((id) => !movingGroupSet.has(id));
            if (group.length === 0) {
                return;
            }

            seenRoots.add(root);
            groups.push(group);
        });

        return groups;
    }

    private collectOccupiedCellsExcluding(excludedPieceIds: ReadonlySet<string>): Set<string> {
        const occupied = new Set<string>();
        this.pieces.forEach((piece, pieceId) => {
            if (excludedPieceIds.has(pieceId)) {
                return;
            }

            const origin = piece.getCurrentOrigin();
            if (!origin) {
                return;
            }

            const absoluteCells = this.board.toAbsoluteCoordinates(piece.getShapeForCurrentRotation(), origin);
            absoluteCells.forEach((cell) => {
                occupied.add(`${cell.x}:${cell.y}`);
            });
        });

        return occupied;
    }

    private tryReservePlannedPlacements(
        plan: ReadonlyMap<string, CellCoordinate>,
        occupiedCells: Set<string>,
    ): boolean {
        for (const [pieceId, origin] of plan.entries()) {
            const piece = this.pieces.get(pieceId);
            if (!piece) {
                return false;
            }

            if (!this.reservePieceCells(piece, origin, occupiedCells)) {
                return false;
            }
        }

        return true;
    }

    private reservePieceCells(piece: PuzzlePiece, origin: CellCoordinate, occupiedCells: Set<string>): boolean {
        const absoluteCells = this.board.toAbsoluteCoordinates(piece.getShapeForCurrentRotation(), origin);
        for (const cell of absoluteCells) {
            if (!this.board.isInsideBounds(cell)) {
                return false;
            }

            const key = `${cell.x}:${cell.y}`;
            if (occupiedCells.has(key)) {
                return false;
            }
        }

        absoluteCells.forEach((cell) => {
            occupiedCells.add(`${cell.x}:${cell.y}`);
        });

        return true;
    }

    private findFirstAvailableOrigin(piece: PuzzlePiece, occupiedCells: Set<string>): CellCoordinate | null {
        for (let y = 0; y < this.board.getGridHeight(); y += 1) {
            for (let x = 0; x < this.board.getGridWidth(); x += 1) {
                const candidate: CellCoordinate = { x, y };
                if (this.canPlacePieceWithoutOverlap(piece, candidate, occupiedCells)) {
                    return candidate;
                }
            }
        }

        return null;
    }

    private canPlacePieceWithoutOverlap(
        piece: PuzzlePiece,
        origin: CellCoordinate,
        occupiedCells: ReadonlySet<string>,
    ): boolean {
        const absoluteCells = this.board.toAbsoluteCoordinates(piece.getShapeForCurrentRotation(), origin);
        return absoluteCells.every((cell) => {
            if (!this.board.isInsideBounds(cell)) {
                return false;
            }

            return !occupiedCells.has(`${cell.x}:${cell.y}`);
        });
    }

    private getMovementStep(current: CellCoordinate, dropped: CellCoordinate): CellCoordinate {
        const deltaX = dropped.x - current.x;
        const deltaY = dropped.y - current.y;
        if (deltaX === 0 && deltaY === 0) {
            return { x: 0, y: 0 };
        }

        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
            return { x: Math.sign(deltaX), y: 0 };
        }

        return { x: 0, y: Math.sign(deltaY) };
    }
}
