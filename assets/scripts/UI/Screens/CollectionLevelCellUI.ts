import { _decorator, Color, Component, Label, Sprite, SpriteFrame } from 'cc';
import { CollectionImagePresentation } from '../../Data/Models/CollectionImagePresentation';

const { ccclass, property } = _decorator;

const LOCKED_IMAGE_COLOR = new Color(150, 150, 150, 255);

@ccclass('CollectionLevelCellUI')
export class CollectionLevelCellUI extends Component {
	@property(Sprite)
	public imageSprite: Sprite | null = null;

	@property(Sprite)
	public borderSprite: Sprite | null = null;

	@property(SpriteFrame)
	public borderOpenSpriteFrame: SpriteFrame | null = null;

	@property(SpriteFrame)
	public borderLockedSpriteFrame: SpriteFrame | null = null;

	@property(Sprite)
	public lockSprite: Sprite | null = null;

	@property(Label)
	public levelLabel: Label | null = null;

	@property(Color)
	public lockedImageColor: Color = LOCKED_IMAGE_COLOR;

	@property(Color)
	public unlockedImageColor: Color = Color.WHITE;

	public render(item: CollectionImagePresentation): void {
		if (!this.imageSprite || !this.borderSprite || !this.lockSprite || !this.levelLabel) {
			throw new Error('CollectionLevelCellUI: required components are not assigned.');
		}

		this.imageSprite.spriteFrame = item.spriteFrame;
		this.levelLabel.string = item.label;

		if (item.isCompleted) {
			this.lockSprite.node.active = false;
			this.imageSprite.color = this.unlockedImageColor;
			this.borderSprite.spriteFrame = this.borderOpenSpriteFrame;
			return;
		}

		this.borderSprite.spriteFrame = this.borderLockedSpriteFrame;
		this.lockSprite.node.active = true;
		this.imageSprite.color = this.lockedImageColor;
	}
}