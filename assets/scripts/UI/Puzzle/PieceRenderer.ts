import { _decorator, Color, Component, Graphics, log, Node, Rect, Size, Sprite, SpriteFrame, UITransform } from 'cc';
import { Shape } from '../../Puzzle/Shape';
import { CellCoordinate } from '../../Puzzle/Types';

const { ccclass, property } = _decorator;

const MAX_COLOR_CHANNEL_VALUE = 255;
const BASE_COLOR_OFFSET = 120;
const COLOR_VARIATION_RANGE = 120;
const RED_SEED_FACTOR = 37;
const GREEN_SEED_FACTOR = 53;
const BLUE_SEED_FACTOR = 67;
const CELL_OUTLINE_WIDTH = 2;
const OUTLINE_DARKEN_STEP = 45;
const TOP_LEFT_ANCHOR_X = 0;
const TOP_LEFT_ANCHOR_Y = 1;
const MIN_CELL_SIZE = 1;

interface PieceImageSliceOptions {
    readonly sourceSpriteFrame: SpriteFrame;
    readonly targetOrigin: CellCoordinate;
    readonly gridWidth: number;
    readonly gridHeight: number;
}

@ccclass('PieceRenderer')
export class PieceRenderer extends Component {
    @property(Sprite)
    private sprite: Sprite | null = null;
    
    @property(UITransform)
    private uiTransform: UITransform | null = null;

    @property(Graphics)
    private graphics: Graphics | null = null;
    
    @property
    private placeholderCellSize = 24;

    @property(SpriteFrame)
    private defaultSpriteFrame: SpriteFrame | null = null;
    
    public render(pieceId: string, shape: Shape, imageSliceOptions?: PieceImageSliceOptions): void {
        this.ensureSprite();
        //log(`[PieceRenderer] Rendering piece with shape:`, shape, `and image slice options:`, imageSliceOptions);
        const color = this.resolvePieceColor(pieceId);
        this.applySize(shape, color, imageSliceOptions);
        //this.applyCellMarkup(shape, color);
    }

    public setCellSize(cellSize: number): void {
        this.placeholderCellSize = Math.max(MIN_CELL_SIZE, cellSize);
    }
    
    setContentSize(width: number, height: number): void {
        this.uiTransform?.setContentSize(width, height);
    }

    private ensureSprite(): void {
        if (this.sprite) {
            return;
        }

        this.sprite = this.node.getComponent(Sprite) ?? this.node.addComponent(Sprite);
        this.sprite.enabled = false;
    }

    private resolvePieceColor(pieceId: string): Color {
        const seed = pieceId
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);

        const red = BASE_COLOR_OFFSET + (seed * RED_SEED_FACTOR) % COLOR_VARIATION_RANGE;
        const green = BASE_COLOR_OFFSET + (seed * GREEN_SEED_FACTOR) % COLOR_VARIATION_RANGE;
        const blue = BASE_COLOR_OFFSET + (seed * BLUE_SEED_FACTOR) % COLOR_VARIATION_RANGE;

        return new Color(red, green, blue, MAX_COLOR_CHANNEL_VALUE);
    }

    private applyCellMarkup(shape: Shape, fillColor: Color): void {
        const graphics = this.graphics;
        if (!graphics) {
            return;
        }

        const cells = shape.getCells();
        const bounds = this.getShapeBounds(cells);
        const pieceWidth = bounds.width * this.placeholderCellSize;
        const pieceHeight = bounds.height * this.placeholderCellSize;
        const left = 0;
        const bottom = -pieceHeight;
        const strokeColor = this.darkenColor(fillColor, OUTLINE_DARKEN_STEP);

        graphics.clear();
        graphics.fillColor = fillColor;
        graphics.strokeColor = strokeColor;

        cells.forEach((cell) => {
            const x = left + cell.x * this.placeholderCellSize;
            const y = bottom + cell.y * this.placeholderCellSize;

            graphics.rect(x, y, this.placeholderCellSize, this.placeholderCellSize);
            graphics.fill();
            graphics.rect(x, y, this.placeholderCellSize, this.placeholderCellSize);
            graphics.stroke();
        });
    }

    private darkenColor(color: Color, amount: number): Color {
        return new Color(
            Math.max(0, color.r - amount),
            Math.max(0, color.g - amount),
            Math.max(0, color.b - amount),
            0,
        );
    }

    private getShapeBounds(cells: ReadonlyArray<{ x: number; y: number }>): { width: number; height: number } {
        const minX = Math.min(...cells.map((cell) => cell.x));
        const minY = Math.min(...cells.map((cell) => cell.y));
        const maxX = Math.max(...cells.map((cell) => cell.x));
        const maxY = Math.max(...cells.map((cell) => cell.y));

        return {
            width: maxX - minX + 1,
            height: maxY - minY + 1,
        };
    }

    private applySize(shape: Shape, fallbackColor: Color, imageSliceOptions?: PieceImageSliceOptions): void {
        const anchorOffset = shape.getAnchorOffset();
        const cells = shape.getCells().map((cell) => ({
            x: cell.x - anchorOffset.x,
            y: cell.y - anchorOffset.y,
        }));
        const bounds = this.getShapeBounds(cells);

        this.node.removeAllChildren();
        this.uiTransform?.setAnchorPoint(TOP_LEFT_ANCHOR_X, TOP_LEFT_ANCHOR_Y);

        this.uiTransform?.setContentSize(bounds.width * this.placeholderCellSize, bounds.height * this.placeholderCellSize);
        for (const cell of cells) {
            const cellNode = new Node(`Cell_${cell.x}_${cell.y}`);
            cellNode.setParent(this.node);
            const cellTransform = cellNode.addComponent(UITransform);
            const cellSprite = cellNode.addComponent(Sprite);
            cellSprite.type = Sprite.Type.SIMPLE;

            const slicedSpriteFrame = imageSliceOptions
                ? this.createSlicedCellSpriteFrame(imageSliceOptions, cell.x, cell.y)
                : null;
            cellSprite.spriteFrame = slicedSpriteFrame ?? this.defaultSpriteFrame;
            cellSprite.color = slicedSpriteFrame ? Color.WHITE : fallbackColor;

            cellTransform.setContentSize(this.placeholderCellSize, this.placeholderCellSize);
            cellTransform.setAnchorPoint(TOP_LEFT_ANCHOR_X, TOP_LEFT_ANCHOR_Y);
            cellNode.setPosition(cell.x * this.placeholderCellSize, -cell.y * this.placeholderCellSize);
        }
    }

    private createSlicedCellSpriteFrame(
        options: PieceImageSliceOptions,
        localCellX: number,
        localCellY: number,
    ): SpriteFrame | null {
        const { sourceSpriteFrame, targetOrigin, gridWidth, gridHeight } = options;
        if (gridWidth <= 0 || gridHeight <= 0 || !sourceSpriteFrame.texture) {
            return null;
        }

        const absoluteCellX = targetOrigin.x + localCellX;
        const absoluteCellY = targetOrigin.y + localCellY;
        if (absoluteCellX < 0 || absoluteCellX >= gridWidth || absoluteCellY < 0 || absoluteCellY >= gridHeight) {
            return null;
        }

        const sourceRect = sourceSpriteFrame.rect;
        const sourceCellWidth = sourceRect.width / gridWidth;
        const sourceCellHeight = sourceRect.height / gridHeight;

        // Align source image rows with board rows directly to avoid vertical flipping.
        const sourceX = sourceRect.x + absoluteCellX * sourceCellWidth;
        const sourceY = sourceRect.y + absoluteCellY * sourceCellHeight;

        const slicedSpriteFrame = new SpriteFrame();
        slicedSpriteFrame.texture = sourceSpriteFrame.texture;
        slicedSpriteFrame.rect = new Rect(sourceX, sourceY, sourceCellWidth, sourceCellHeight);
        slicedSpriteFrame.originalSize = new Size(sourceCellWidth, sourceCellHeight);

        return slicedSpriteFrame;
    }
}
