import { Rect, Size, SpriteFrame } from 'cc';

const DEFAULT_CACHE_KEY_SEPARATOR = ':';

export interface SpriteFrameGridSliceOptions {
	readonly sourceSpriteFrame: SpriteFrame;
	readonly gridWidth: number;
	readonly gridHeight: number;
	readonly cellX: number;
	readonly cellY: number;
}

export class SpriteFrameSliceService {
	private readonly cache = new WeakMap<SpriteFrame, Map<string, SpriteFrame>>();

	public sliceGridCell(options: SpriteFrameGridSliceOptions): SpriteFrame | null {
		const { sourceSpriteFrame, gridWidth, gridHeight, cellX, cellY } = options;
		if (gridWidth <= 0 || gridHeight <= 0 || !sourceSpriteFrame.texture) {
			throw new Error('Invalid grid slice options provided. Grid width and height must be positive, and source sprite frame must have a valid texture.');
		}

		if (cellX < 0 || cellX >= gridWidth || cellY < 0 || cellY >= gridHeight) {
			throw new Error(`Cell coordinates (${cellX}, ${cellY}) are out of bounds for the grid size (${gridWidth}, ${gridHeight}).`);
		}

		const cacheKey = this.createCacheKey(gridWidth, gridHeight, cellX, cellY, sourceSpriteFrame.rect.x, sourceSpriteFrame.rect.y, sourceSpriteFrame.rect.width, sourceSpriteFrame.rect.height);
		const cachedSpriteFrame = this.getCachedSpriteFrame(sourceSpriteFrame, cacheKey);
		if (cachedSpriteFrame) {
			return cachedSpriteFrame;
		}

		const sourceRect = sourceSpriteFrame.rect;
		const sourceCellWidth = sourceRect.width / gridWidth;
		const sourceCellHeight = sourceRect.height / gridHeight;
		const sourceX = sourceRect.x + cellX * sourceCellWidth;
		const sourceY = sourceRect.y + cellY * sourceCellHeight;

		const slicedSpriteFrame = new SpriteFrame();
		slicedSpriteFrame.texture = sourceSpriteFrame.texture;
		slicedSpriteFrame.rect = new Rect(sourceX, sourceY, sourceCellWidth, sourceCellHeight);
		slicedSpriteFrame.originalSize = new Size(sourceCellWidth, sourceCellHeight);

		this.setCachedSpriteFrame(sourceSpriteFrame, cacheKey, slicedSpriteFrame);

		return slicedSpriteFrame;
	}

	private createCacheKey(
		gridWidth: number,
		gridHeight: number,
		cellX: number,
		cellY: number,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
	): string {
		return [gridWidth, gridHeight, cellX, cellY, sourceX, sourceY, sourceWidth, sourceHeight].join(DEFAULT_CACHE_KEY_SEPARATOR);
	}

	private getCachedSpriteFrame(sourceSpriteFrame: SpriteFrame, cacheKey: string): SpriteFrame | null {
		const spriteFrameCache = this.cache.get(sourceSpriteFrame);
		if (!spriteFrameCache) {
			return null;
		}

		return spriteFrameCache.get(cacheKey) ?? null;
	}

	private setCachedSpriteFrame(sourceSpriteFrame: SpriteFrame, cacheKey: string, slicedSpriteFrame: SpriteFrame): void {
		const spriteFrameCache = this.cache.get(sourceSpriteFrame) ?? new Map<string, SpriteFrame>();
		spriteFrameCache.set(cacheKey, slicedSpriteFrame);
		this.cache.set(sourceSpriteFrame, spriteFrameCache);
	}
}