import { instantiate, Node, Prefab, UITransform } from 'cc';
import { PieceRenderer } from '../UI/Puzzle/PieceRenderer';

/**
 * PieceNodePool
 * 
 * Object pool for reusing piece Node objects across level replays.
 * Reduces garbage collection pressure and improves performance with frequent piece creation/destruction.
 * 
 * Responsibilities:
 * - Create and store pooled nodes
 * - Get/release pattern for node reuse
 * - Reset node state on release for clean reuse
 */
export class PieceNodePool {
    private readonly pool: PieceRenderer[] = [];
    private readonly activeRenderers = new Set<PieceRenderer>();
    private readonly poolSize: number;
    private readonly pieceRendererPrefab: Prefab | null;

    public constructor(initialPoolSize: number = 20, pieceRendererPrefab: Prefab | null = null) {
        this.poolSize = initialPoolSize;
        this.pieceRendererPrefab = pieceRendererPrefab;
        this.preAllocate();
    }

    /** Pre-allocate nodes in the pool */
    private preAllocate(): void {
        for (let i = 0; i < this.poolSize; i += 1) {
            this.pool.push(this.createRenderer(`PooledPiece_${i}`));
        }
    }

    private createRenderer(nodeName: string): PieceRenderer {
        if (this.pieceRendererPrefab) {
            const pieceRenderer = instantiate(this.pieceRendererPrefab).getComponent(PieceRenderer)!;
            pieceRenderer.node.name = nodeName;
            return pieceRenderer;
        } else {
            throw new Error('PieceRenderer prefab is not provided for PieceNodePool.');
        }
    }
    /**
     * Get a node from the pool or create a new one if pool is empty.
     * Marks the node as active.
     */
    public get(): PieceRenderer {
        let renderer: PieceRenderer;
        if (this.pool.length > 0) {
            renderer = this.pool.pop()!;
        } else {
            // Dynamically create if pool exhausted (optional fallback)
            renderer = this.createRenderer('PooledPiece_Dynamic');
        }

        this.activeRenderers.add(renderer);
        const node = renderer.node;
        node.active = true;
        return renderer;
    }

    /**
     * Release a node back to the pool.
     * Resets node state for clean reuse.
     */
    public release(renderer: PieceRenderer): void {
        if (!this.activeRenderers.has(renderer)) {
            return; // Not from this pool, ignore
        }

        this.activeRenderers.delete(renderer);

        const node = renderer.node;

        // Reset node state for reuse
        node.active = false;
        node.setPosition(0, 0, 0);
        node.setRotationFromEuler(0, 0, 0);
        node.setScale(1, 1, 1);
        node.removeAllChildren();
        node.setParent(null);

        // Return to pool if still under limit
        if (this.pool.length < this.poolSize) {
            this.pool.push(renderer);
        } else {
            // Destroy excess nodes
            node.destroy();
        }
    }

    /** Release all active nodes back to the pool */
    public releaseAll(): void {
        Array.from(this.activeRenderers).forEach((renderer) => {
            this.release(renderer);
        });
    }

    /** Clear the pool (destroy all nodes) */
    public clear(): void {
        this.releaseAll();
        this.pool.forEach((renderer) => renderer.node.destroy());
        this.pool.length = 0;
    }

    /** Get current pool stats for monitoring */
    public getStats(): { pooled: number; active: number; total: number } {
        return {
            pooled: this.pool.length,
            active: this.activeRenderers.size,
            total: this.pool.length + this.activeRenderers.size,
        };
    }
}
