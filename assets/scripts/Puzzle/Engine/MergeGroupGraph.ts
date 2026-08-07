import { PuzzleBoard } from '../PuzzleBoard';
import { PuzzlePiece } from '../PuzzlePiece';
import { CellCoordinate } from '../Types';

const ORTHOGONAL_OFFSETS: ReadonlyArray<CellCoordinate> = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
];

/**
 * Tracks which pieces form a merged group based on their current adjacency
 * and whether the merged arrangement matches the pieces' target layout.
 * Group membership is recomputed from the board after every placement.
 */
export class MergeGroupGraph {
    private readonly groupParentByPieceId = new Map<string, string>();

    public constructor(
        private readonly pieces: Map<string, PuzzlePiece>,
        private readonly board: PuzzleBoard,
        private readonly mergeEnabled: boolean,
    ) {}

    public getGroupPieceIds(pieceId: string): ReadonlyArray<string> {
        if (!this.pieces.has(pieceId)) {
            return [];
        }

        const root = this.findGroupRoot(pieceId);
        const group: string[] = [];
        this.pieces.forEach((_, candidateId) => {
            if (this.findGroupRoot(candidateId) === root) {
                group.push(candidateId);
            }
        });

        return group;
    }

    public getAdjacentPieceIds(pieceId: string): ReadonlyArray<string> {
        const coordinates = this.board.getOccupiedCoordinates(pieceId);
        const adjacent = new Set<string>();

        coordinates.forEach((coordinate) => {
            ORTHOGONAL_OFFSETS.forEach((offset) => {
                const neighborCoordinate: CellCoordinate = {
                    x: coordinate.x + offset.x,
                    y: coordinate.y + offset.y,
                };
                const neighborId = this.board.getPieceIdAt(neighborCoordinate);
                if (neighborId && neighborId !== pieceId) {
                    adjacent.add(neighborId);
                }
            });
        });

        return Array.from(adjacent.values());
    }

    public findGroupRoot(pieceId: string): string {
        const parent = this.groupParentByPieceId.get(pieceId);
        if (!parent || parent === pieceId) {
            return pieceId;
        }

        const root = this.findGroupRoot(parent);
        this.groupParentByPieceId.set(pieceId, root);
        return root;
    }

    /**
     * Recomputes merge groups from the current layout and returns the ids of
     * groups that did not exist in the previous grouping (newly merged groups).
     */
    public rebuild(): ReadonlyArray<ReadonlyArray<string>> {
        const previousGroups = this.snapshotCurrentGroups();

        this.pieces.forEach((piece, pieceId) => {
            this.groupParentByPieceId.set(pieceId, pieceId);
            piece.setGroupId(pieceId);
        });

        if (!this.mergeEnabled) {
            return [];
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

        return currentMergedGroups.filter((groupIds) => {
            const normalized = this.normalizeGroupIds(groupIds);
            return !previousGroups.some((previous) => this.areNormalizedGroupsEqual(previous, normalized));
        });
    }

    public shouldMergeByTargetAdjacency(firstPieceId: string, secondPieceId: string): boolean {
        const first = this.pieces.get(firstPieceId);
        const second = this.pieces.get(secondPieceId);
        if (!first || !second) {
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

        return Array.from(currentDirectionSet.values()).some((direction) => targetDirectionSet.has(direction));
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

    private snapshotCurrentGroups(): ReadonlyArray<ReadonlyArray<string>> {
        const groupsByRoot = new Map<string, string[]>();
        this.pieces.forEach((_, pieceId) => {
            const root = this.findGroupRoot(pieceId);
            const group = groupsByRoot.get(root) ?? [];
            group.push(pieceId);
            groupsByRoot.set(root, group);
        });

        return Array.from(groupsByRoot.values())
            .filter((group) => group.length > 1)
            .map((group) => this.normalizeGroupIds(group));
    }

    private normalizeGroupIds(groupIds: ReadonlyArray<string>): string[] {
        return [...groupIds].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
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

    private getAdjacencyDirections(
        firstCoordinates: ReadonlyArray<CellCoordinate>,
        secondCoordinates: ReadonlyArray<CellCoordinate>,
    ): Set<string> {
        const secondByKey = new Set<string>(secondCoordinates.map((coordinate) => `${coordinate.x}:${coordinate.y}`));
        const directions = new Set<string>();

        firstCoordinates.forEach((coordinate) => {
            ORTHOGONAL_OFFSETS.forEach((offset) => {
                const neighborKey = `${coordinate.x + offset.x}:${coordinate.y + offset.y}`;
                if (secondByKey.has(neighborKey)) {
                    directions.add(`${offset.x}:${offset.y}`);
                }
            });
        });

        return directions;
    }
}
