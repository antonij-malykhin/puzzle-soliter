import { _decorator, Color, Component, Graphics, log, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { Shape } from '../../Puzzle/Shape';
import { CellCoordinate } from '../../Puzzle/Types';
import { SpriteFrameSliceService } from '../../Services/SpriteFrameSliceService';

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
    private boardGraphics: Graphics | null = null;
    
    @property
    private placeholderCellSize: {x: number; y: number} = {x: 100, y: 100};
    
    @property(SpriteFrame)
    private defaultSpriteFrame: SpriteFrame | null = null;
    
    private spriteFrameSliceService!: SpriteFrameSliceService;

    public initialize(spriteFrameSliceService: SpriteFrameSliceService) {
        this.spriteFrameSliceService = spriteFrameSliceService;
    }
    
    public render(pieceId: string, shape: Shape, imageSliceOptions?: PieceImageSliceOptions): void {
        this.ensureSprite();
        //log(`[PieceRenderer] Rendering piece with shape:`, shape, `and image slice options:`, imageSliceOptions);
        const color = this.resolvePieceColor(pieceId);
        this.applySize(shape, color, imageSliceOptions);
        //this.applyCellMarkup(shape, color);
    }

    public setCellSize(cellSize: {x: number; y: number}): void {
        this.placeholderCellSize = {
            x: Math.max(MIN_CELL_SIZE, cellSize.x),
            y: Math.max(MIN_CELL_SIZE, cellSize.y),
        };
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

        this.uiTransform?.setAnchorPoint(TOP_LEFT_ANCHOR_X, TOP_LEFT_ANCHOR_Y);

        this.uiTransform?.setContentSize(bounds.width * this.placeholderCellSize.x, bounds.height * this.placeholderCellSize.y);
        for (const cell of cells) {
            const cellNode = new Node(`Cell_${cell.x}_${cell.y}`);
            cellNode.setParent(this.node);
            cellNode.setSiblingIndex(0);
            const cellTransform = cellNode.addComponent(UITransform);
            const cellSprite = cellNode.addComponent(Sprite);
            cellSprite.type = Sprite.Type.SIMPLE;

            const slicedSpriteFrame = imageSliceOptions
                ? this.spriteFrameSliceService.sliceGridCell({
                    sourceSpriteFrame: imageSliceOptions.sourceSpriteFrame,
                    gridWidth: imageSliceOptions.gridWidth,
                    gridHeight: imageSliceOptions.gridHeight,
                    cellX: imageSliceOptions.targetOrigin.x + cell.x,
                    cellY: imageSliceOptions.targetOrigin.y + cell.y,
                })
                : null;
            cellSprite.spriteFrame = slicedSpriteFrame ?? this.defaultSpriteFrame;
            cellSprite.color = slicedSpriteFrame ? Color.WHITE : fallbackColor;

            cellTransform.setContentSize(this.placeholderCellSize.x, this.placeholderCellSize.y);
            cellTransform.setAnchorPoint(TOP_LEFT_ANCHOR_X, TOP_LEFT_ANCHOR_Y);
            cellNode.setPosition(cell.x * this.placeholderCellSize.x, -cell.y * this.placeholderCellSize.y);
        }
    }

}
