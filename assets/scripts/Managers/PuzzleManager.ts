import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { GameManager } from './GameManager';
import { PuzzleGenerator } from '../Generation/PuzzleGenerator';
import { GeneratedPieceDefinition } from '../Generation/GenerationTypes';
import { PuzzleBoard } from '../Puzzle/PuzzleBoard';
import { PuzzlePiece } from '../Puzzle/PuzzlePiece';
import { Shape } from '../Puzzle/Shape';
import { CellCoordinate } from '../Puzzle/Types';
import { PuzzleValidator } from '../Validation/PuzzleValidator';
import { SnapSystem } from '../Validation/SnapSystem';
import { LevelData } from '../Data/Models/LevelData';
import { PuzzleGameplayMode } from '../Data/Models/PuzzleGameplayMode';
import { DEFAULT_MERGE_ENABLED } from '../Core/Config/GameConstants';
import { log } from 'cc';

export class PuzzleManager {
    private board: PuzzleBoard | null = null;
    private levelData: LevelData | null = null;
    private levelId: string | null = null;
    private levelStartedAtMs = 0;
    private readonly pieces = new Map<string, PuzzlePiece>();
    private readonly groupParentByPieceId = new Map<string, string>();

    public constructor(
        private readonly eventBus: EventBus<GameEventMap>,
        private readonly gameManager: GameManager,
        private readonly generator: PuzzleGenerator,
        private readonly validator: PuzzleValidator,
        private readonly snapSystem: SnapSystem,
    ) {}

    public initializeLevel(levelData: LevelData): void {
        this.levelData = levelData;
        this.levelId = levelData.id;
        this.levelStartedAtMs = Date.now();
        this.board = new PuzzleBoard(levelData.gridWidth, levelData.gridHeight, this.validator);
        this.pieces.clear();
        this.groupParentByPieceId.clear();

        const generatedPieces = this.isRectSwapMergeMode()
            ? this.generateRectangularPieces(levelData)
            : this.generator.generate({
                gridWidth: levelData.gridWidth,
                gridHeight: levelData.gridHeight,
                minPieceSize: levelData.minPieceSize,
                maxPieceSize: levelData.maxPieceSize,
                allowDisconnectedShapeCells: levelData.allowDisconnectedShapeCells,
            }).pieces;

        log('PuzzleManager: Level initialized. Level ID =', levelData.id, 'Generated pieces =', generatedPieces.length);
        generatedPieces.forEach((definition) => {
            const piece = new PuzzlePiece(definition.id, definition.shape, definition.targetOrigin);
            this.pieces.set(definition.id, piece);
            this.groupParentByPieceId.set(definition.id, definition.id);
        });

        if (this.isRectSwapMergeMode()) {
            this.initializeRectSwapMergeLayout();
        }
    }

    public rotatePiece(pieceId: string): void {
        const piece = this.pieces.get(pieceId);
        if (!piece || piece.isLocked()) {
            return;
        }

        piece.rotateClockwise();
        this.eventBus.emit('PieceRotated', {
            pieceId,
            rotation: piece.getCurrentRotation(),
        });
    }

    public tryPlacePiece(pieceId: string, droppedOrigin: CellCoordinate, snapThreshold: number): boolean {
        if (!this.board || !this.levelId) {
            return false;
        }

        if (this.isRectSwapMergeMode()) {
            return this.trySwapMovePiece(pieceId, droppedOrigin);
        }

        const piece = this.pieces.get(pieceId);
        if (!piece || piece.isLocked()) {
            return false;
        }

        this.eventBus.emit('PiecePicked', { pieceId });

        const snappedOrigin = this.snapSystem.trySnapToTarget(
            droppedOrigin,
            piece.getTargetOrigin(),
            snapThreshold,
        );

        if (!snappedOrigin) {
            piece.setCurrentOrigin(droppedOrigin);
            piece.setPlaced(false);
            console.log('Not snapped origin. Dropped origin =', droppedOrigin, 'Target origin =', piece.getTargetOrigin());
            return false;
        }

        const validationResult = this.validator.validatePlacement(this.board, piece, snappedOrigin);
        if (!validationResult.isValid) {
            piece.setCurrentOrigin(droppedOrigin);
            piece.setPlaced(false);
            console.log('Invalid placement. Reason =', validationResult.reason);
            return false;
        }

        const placed = this.board.placePiece(piece, snappedOrigin);
        if (!placed) {
            console.log('Failed to place piece on the board. Piece ID =', pieceId, 'Snapped origin =', snappedOrigin);
        }

        piece.lock(snappedOrigin);
        this.eventBus.emit('PiecePlaced', {
            pieceId,
            lockedPieces: this.getLockedPieceCount(),
            totalPieces: this.pieces.size,
        });

        if (this.isSolved()) {
            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.levelStartedAtMs) / 1000));
            this.gameManager.completeLevel(this.levelId, elapsedSeconds);
        }

        return true;
    }

    public getGroupPieceIds(pieceId: string): ReadonlyArray<string> {
        if (!this.pieces.has(pieceId)) {
            return [];
        }

        const root = this.findGroupRoot(pieceId);
        return [...this.pieces.values()]
            .filter((piece) => this.findGroupRoot(piece.getId()) === root)
            .map((piece) => piece.getId());
    }

    public getBoard(): PuzzleBoard | null {
        return this.board;
    }

    public getLevelData(): LevelData | null {
        return this.levelData;
    }

    public getPieces(): ReadonlyArray<PuzzlePiece> {
        return [...this.pieces.values()];
    }

    private isSolved(): boolean {
        if (!this.board) {
            return false;
        }

        if (this.isRectSwapMergeMode()) {
            return this.isRectSwapMergeSolved();
        }

        const everyPieceLocked = [...this.pieces.values()].every((piece) => piece.isLocked());
        const fullyOccupied = this.board.isFullyOccupied();
        return everyPieceLocked && fullyOccupied;
    }

    private getLockedPieceCount(): number {
        return [...this.pieces.values()].filter((piece) => piece.isLocked()).length;
    }

    private isRectSwapMergeMode(): boolean {
        return this.levelData?.gameMode === PuzzleGameplayMode.RectSwapMerge;
    }

    private generateRectangularPieces(levelData: LevelData): ReadonlyArray<GeneratedPieceDefinition> {
        const pieceColumns = levelData.pieceColumns;
        const pieceRows = levelData.pieceRows;
        if (!pieceColumns || !pieceRows || pieceColumns <= 0 || pieceRows <= 0) {
            throw new Error('rectSwapMerge mode requires positive pieceColumns and pieceRows in level data.');
        }

        if ((levelData.gridWidth % pieceColumns) !== 0 || (levelData.gridHeight % pieceRows) !== 0) {
            throw new Error(
                `Grid ${levelData.gridWidth}x${levelData.gridHeight} cannot be evenly sliced into ${pieceColumns}x${pieceRows} pieces.`,
            );
        }

        const pieceWidth = levelData.gridWidth / pieceColumns;
        const pieceHeight = levelData.gridHeight / pieceRows;
        const definitions: GeneratedPieceDefinition[] = [];
        let pieceIndex = 0;
        for (let pieceRow = 0; pieceRow < pieceRows; pieceRow += 1) {
            for (let pieceColumn = 0; pieceColumn < pieceColumns; pieceColumn += 1) {
                const originX = pieceColumn * pieceWidth;
                const originY = pieceRow * pieceHeight;

                const cells: CellCoordinate[] = [];
                for (let localY = 0; localY < pieceHeight; localY += 1) {
                    for (let localX = 0; localX < pieceWidth; localX += 1) {
                        cells.push({ x: localX, y: localY });
                    }
                }

                definitions.push({
                    id: `piece-${pieceIndex}`,
                    shape: new Shape(cells),
                    targetOrigin: { x: originX, y: originY },
                });
                pieceIndex += 1;
            }
        }

        return definitions;
    }

    private initializeRectSwapMergeLayout(): void {
        if (!this.board) {
            return;
        }

        const pieces = [...this.pieces.values()];
        const allRectangles = pieces.every((piece) => piece.getBaseShape().isAxisAlignedRectangle());
        if (!allRectangles) {
            log('PuzzleManager: rectSwapMerge requires rectangle pieces. Falling back to classic mode behavior.');
            return;
        }

        const piecesByFootprint = new Map<string, Array<{ piece: PuzzlePiece; origin: CellCoordinate }>>();
        pieces.forEach((piece) => {
            const footprintKey = this.getRectangleFootprintKey(piece.getBaseShape());
            const items = piecesByFootprint.get(footprintKey) ?? [];
            items.push({ piece, origin: piece.getTargetOrigin() });
            piecesByFootprint.set(footprintKey, items);
        });

        piecesByFootprint.forEach((items) => {
            const shuffledOrigins = this.shuffleCoordinates(items.map((item) => item.origin));
            items.forEach((item, index) => {
                const origin = shuffledOrigins[index];
                const placed = this.board!.placePiece(item.piece, origin);
                if (!placed) {
                    throw new Error(`Failed to place piece ${item.piece.getId()} during rect swap layout initialization.`);
                }

                item.piece.setCurrentOrigin(origin);
                item.piece.setPlaced(true);
                this.eventBus.emit('PieceMoved', {
                    pieceId: item.piece.getId(),
                    origin,
                });
            });
        });

        this.rebuildGroupsFromCurrentLayout();
    }

    private getRectangleFootprintKey(shape: Shape): string {
        return `${shape.getBoundingWidth()}x${shape.getBoundingHeight()}`;
    }

    private shuffleCoordinates(coordinates: ReadonlyArray<CellCoordinate>): CellCoordinate[] {
        const shuffled = [...coordinates];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            const current = shuffled[index];
            shuffled[index] = shuffled[randomIndex];
            shuffled[randomIndex] = current;
        }

        return shuffled;
    }

    private trySwapMovePiece(pieceId: string, droppedOrigin: CellCoordinate): boolean {
        if (!this.board || !this.levelId) {
            return false;
        }

        const movingPiece = this.pieces.get(pieceId);
        if (!movingPiece) {
            return false;
        }

        const movingGroupPieceIds = this.getGroupPieceIds(pieceId);
        if (movingGroupPieceIds.length > 1) {
            return this.tryMoveMergedGroup(pieceId, droppedOrigin, movingGroupPieceIds);
        }

        this.eventBus.emit('PiecePicked', { pieceId });
        const occupantPieceId = this.board.getPieceIdAt(droppedOrigin);
        if (!occupantPieceId) {
            return false;
        }

        if (occupantPieceId === pieceId) {
            return true;
        }

        const occupantPiece = this.pieces.get(occupantPieceId);
        const movingOrigin = movingPiece.getCurrentOrigin();
        const occupantOrigin = occupantPiece?.getCurrentOrigin() ?? null;
        if (!occupantPiece || !movingOrigin || !occupantOrigin) {
            return false;
        }

        const moved = this.board.swapPlacedPieces(movingPiece, movingOrigin, occupantPiece, occupantOrigin);
        if (!moved) {
            return false;
        }

        movingPiece.setCurrentOrigin(occupantOrigin);
        occupantPiece.setCurrentOrigin(movingOrigin);
        movingPiece.setPlaced(true);
        occupantPiece.setPlaced(true);

        this.eventBus.emit('PieceMoved', { pieceId: movingPiece.getId(), origin: occupantOrigin });
        this.eventBus.emit('PieceMoved', { pieceId: occupantPiece.getId(), origin: movingOrigin });
        this.eventBus.emit('PiecesSwapped', {
            firstPieceId: movingPiece.getId(),
            firstOrigin: occupantOrigin,
            secondPieceId: occupantPiece.getId(),
            secondOrigin: movingOrigin,
        });

        this.rebuildGroupsFromCurrentLayout();

        if (this.isSolved()) {
            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.levelStartedAtMs) / 1000));
            this.gameManager.completeLevel(this.levelId, elapsedSeconds);
        }

        return true;
    }

    private tryMoveMergedGroup(
        anchorPieceId: string,
        droppedOrigin: CellCoordinate,
        groupPieceIds: ReadonlyArray<string>,
    ): boolean {
        if (!this.board || !this.levelId) {
            return false;
        }

        const anchorPiece = this.pieces.get(anchorPieceId);
        const anchorOrigin = anchorPiece?.getCurrentOrigin() ?? null;
        if (!anchorPiece || !anchorOrigin) {
            return false;
        }

        const step = this.getMovementStep(anchorOrigin, droppedOrigin);
        if (step.x === 0 && step.y === 0) {
            return false;
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
            return false;
        }

        const targetByPieceId = new Map<string, CellCoordinate>();
        const enteringExternalPieceIds = new Set<string>();

        for (const [pieceId, origin] of groupOrigins.entries()) {
            const target: CellCoordinate = { x: origin.x + step.x, y: origin.y + step.y };
            targetByPieceId.set(pieceId, target);

            const piece = this.pieces.get(pieceId);
            if (!piece) {
                return false;
            }

            const targetCells = this.board.toAbsoluteCoordinates(piece.getShapeForCurrentRotation(), target);
            for (const cell of targetCells) {
                if (!this.board.isInsideBounds(cell)) {
                    return false;
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
            return false;
        }

        const movingPieceIds = [...relocationPlan.keys()];
        const allOriginsByPieceId = new Map<string, CellCoordinate>();
        movingPieceIds.forEach((id) => {
            const origin = this.pieces.get(id)?.getCurrentOrigin();
            if (origin) {
                allOriginsByPieceId.set(id, origin);
            }
        });

        if (allOriginsByPieceId.size !== movingPieceIds.length) {
            return false;
        }

        movingPieceIds.forEach((id) => this.board!.removePiece(id));

        const placedAll = [...relocationPlan.entries()].every(([id, target]) => {
            const piece = this.pieces.get(id);
            return piece ? this.board!.placePiece(piece, target) : false;
        });

        if (!placedAll) {
            movingPieceIds.forEach((id) => this.board!.removePiece(id));
            allOriginsByPieceId.forEach((origin, id) => {
                const piece = this.pieces.get(id);
                if (piece) {
                    this.board!.placePiece(piece, origin);
                }
            });
            return false;
        }

        [...relocationPlan.entries()].forEach(([id, target]) => {
            const piece = this.pieces.get(id);
            piece?.setCurrentOrigin(target);
            piece?.setPlaced(true);
            this.eventBus.emit('PieceMoved', { pieceId: id, origin: target });
        });

        this.rebuildGroupsFromCurrentLayout();

        if (this.isSolved()) {
            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.levelStartedAtMs) / 1000));
            this.gameManager.completeLevel(this.levelId, elapsedSeconds);
        }

        return true;
    }

    private buildRelocationPlanForGroupMove(
        movingGroupPieceIds: ReadonlyArray<string>,
        movingTargets: ReadonlyMap<string, CellCoordinate>,
        enteringExternalPieceIds: ReadonlySet<string>,
        step: CellCoordinate,
    ): Map<string, CellCoordinate> | null {
        if (!this.board) {
            return null;
        }

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
            const root = this.findGroupRoot(pieceId);
            if (seenRoots.has(root)) {
                return;
            }

            const group = this.getGroupPieceIds(pieceId).filter((id) => !movingGroupSet.has(id));
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
            if (!origin || !this.board) {
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
        if (!this.board) {
            return false;
        }

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
        if (!this.board) {
            return null;
        }

        for (let y = 0; y < this.board.getGridHeight(); y += 1) {
            for (let x = 0; x < this.board.getGridWidth(); x += 1) {
                const candidate: CellCoordinate = { x, y };
                if (!this.canPlacePieceWithoutOverlap(piece, candidate, occupiedCells)) {
                    continue;
                }

                return candidate;
            }
        }

        return null;
    }

    private canPlacePieceWithoutOverlap(
        piece: PuzzlePiece,
        origin: CellCoordinate,
        occupiedCells: ReadonlySet<string>,
    ): boolean {
        if (!this.board) {
            return false;
        }

        const absoluteCells = this.board.toAbsoluteCoordinates(piece.getShapeForCurrentRotation(), origin);
        return absoluteCells.every((cell) => {
            if (!this.board!.isInsideBounds(cell)) {
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

    private rebuildGroupsFromCurrentLayout(): void {
        const previousGroups = this.snapshotCurrentGroups();

        this.pieces.forEach((piece, pieceId) => {
            this.groupParentByPieceId.set(pieceId, pieceId);
            piece.setGroupId(pieceId);
        });

        if (!this.isMergeEnabled()) {
            return;
        }

        const visited = new Set<string>();
        const currentMergedGroups: string[][] = [];

        this.pieces.forEach((_, pieceId) => {
            if (visited.has(pieceId)) {
                return;
            }

            const component = this.collectMergeComponent(pieceId, visited);
            if (component.length <= 1) {
                return;
            }

            const rootId = component[0];
            component.forEach((id) => {
                this.groupParentByPieceId.set(id, rootId);
                this.pieces.get(id)?.setGroupId(rootId);
            });

            currentMergedGroups.push(component);
        });

        currentMergedGroups.forEach((groupIds) => {
            const normalized = this.normalizeGroupIds(groupIds);
            const alreadyExisted = previousGroups.some((previous) => this.areNormalizedGroupsEqual(previous, normalized));
            if (alreadyExisted) {
                return;
            }

            this.eventBus.emit('PiecesMerged', {
                groupId: groupIds[0],
                pieceIds: groupIds,
            });
        });
    }

    private collectMergeComponent(startPieceId: string, visited: Set<string>): string[] {
        const stack: string[] = [startPieceId];
        const component: string[] = [];
        visited.add(startPieceId);

        while (stack.length > 0) {
            const currentPieceId = stack.pop();
            if (!currentPieceId) {
                continue;
            }

            component.push(currentPieceId);
            const neighbors = this.getAdjacentPieceIds(currentPieceId);
            neighbors.forEach((neighborId) => {
                if (visited.has(neighborId)) {
                    return;
                }

                if (!this.shouldMergeByTargetAdjacency(currentPieceId, neighborId)) {
                    return;
                }

                visited.add(neighborId);
                stack.push(neighborId);
            });
        }

        return component;
    }

    private snapshotCurrentGroups(): string[][] {
        const groupsByRoot = new Map<string, string[]>();
        this.pieces.forEach((_, pieceId) => {
            const root = this.findGroupRoot(pieceId);
            const group = groupsByRoot.get(root) ?? [];
            group.push(pieceId);
            groupsByRoot.set(root, group);
        });

        return [...groupsByRoot.values()]
            .filter((group) => group.length > 1)
            .map((group) => this.normalizeGroupIds(group));
    }

    private normalizeGroupIds(groupIds: ReadonlyArray<string>): string[] {
        return [...groupIds].sort((left, right) => left.localeCompare(right));
    }

    private areNormalizedGroupsEqual(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
        if (left.length !== right.length) {
            return false;
        }

        for (let index = 0; index < left.length; index += 1) {
            if (left[index] !== right[index]) {
                return false;
            }
        }

        return true;
    }

    private getAdjacentPieceIds(pieceId: string): ReadonlyArray<string> {
        if (!this.board) {
            return [];
        }

        const coordinates = this.board.getOccupiedCoordinates(pieceId);
        const adjacent = new Set<string>();
        const offsets: ReadonlyArray<CellCoordinate> = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        coordinates.forEach((coordinate) => {
            offsets.forEach((offset) => {
                const neighborCoordinate: CellCoordinate = {
                    x: coordinate.x + offset.x,
                    y: coordinate.y + offset.y,
                };
                const neighborId = this.board!.getPieceIdAt(neighborCoordinate);
                if (neighborId && neighborId !== pieceId) {
                    adjacent.add(neighborId);
                }
            });
        });

        return [...adjacent.values()];
    }

    private shouldMergeByTargetAdjacency(firstPieceId: string, secondPieceId: string): boolean {
        const first = this.pieces.get(firstPieceId);
        const second = this.pieces.get(secondPieceId);
        if (!first || !second || !this.board) {
            return false;
        }

        const currentDirectionSet = this.getAdjacencyDirections(
            this.board.getOccupiedCoordinates(firstPieceId),
            this.board.getOccupiedCoordinates(secondPieceId),
        );
        if (currentDirectionSet.size === 0) {
            return false;
        }

        const firstTargetCoordinates = this.board.toAbsoluteCoordinates(first.getBaseShape(), first.getTargetOrigin());
        const secondTargetCoordinates = this.board.toAbsoluteCoordinates(second.getBaseShape(), second.getTargetOrigin());
        const targetDirectionSet = this.getAdjacencyDirections(firstTargetCoordinates, secondTargetCoordinates);
        if (targetDirectionSet.size === 0) {
            return false;
        }

        return [...currentDirectionSet.values()].some((direction) => targetDirectionSet.has(direction));
    }

    private getAdjacencyDirections(
        firstCoordinates: ReadonlyArray<CellCoordinate>,
        secondCoordinates: ReadonlyArray<CellCoordinate>,
    ): Set<string> {
        const secondByKey = new Set<string>(secondCoordinates.map((coordinate) => `${coordinate.x}:${coordinate.y}`));
        const directions = new Set<string>();
        const offsets: ReadonlyArray<CellCoordinate> = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        firstCoordinates.forEach((coordinate) => {
            offsets.forEach((offset) => {
                const neighborKey = `${coordinate.x + offset.x}:${coordinate.y + offset.y}`;
                if (secondByKey.has(neighborKey)) {
                    directions.add(`${offset.x}:${offset.y}`);
                }
            });
        });

        return directions;
    }

    private isMergeEnabled(): boolean {
        if (!this.levelData) {
            return DEFAULT_MERGE_ENABLED;
        }

        return this.levelData.mergeEnabled ?? DEFAULT_MERGE_ENABLED;
    }

    private findGroupRoot(pieceId: string): string {
        const parent = this.groupParentByPieceId.get(pieceId);
        if (!parent || parent === pieceId) {
            return pieceId;
        }

        const root = this.findGroupRoot(parent);
        this.groupParentByPieceId.set(pieceId, root);
        return root;
    }

    private isRectSwapMergeSolved(): boolean {
        const pieces = [...this.pieces.values()];
        if (pieces.length === 0) {
            return false;
        }

        const everyPieceAtTarget = pieces.every((piece) => {
            const current = piece.getCurrentOrigin();
            const target = piece.getTargetOrigin();
            return current != null
                && current.x === target.x
                && current.y === target.y
                && piece.getCurrentRotation() === piece.getTargetRotation();
        });

        if (!everyPieceAtTarget) {
            return false;
        }

        const firstRoot = this.findGroupRoot(pieces[0].getId());
        return pieces.every((piece) => this.findGroupRoot(piece.getId()) === firstRoot);
    }
}
