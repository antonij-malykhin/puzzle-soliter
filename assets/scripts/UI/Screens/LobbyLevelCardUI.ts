import { _decorator, Component, Label, Sprite, SpriteFrame } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('LobbyLevelCardUI')
export class LobbyLevelCardUI extends Component {
    @property(Sprite)
    public backsideSprite: Sprite | null = null;
    
    @property(Sprite)
    public frontsideSprite: Sprite | null = null;
    
    @property(Label)
    public levelNumberLabel: Label | null = null;

	public setLevelNumberLabel(levelNumber: string) {
		this.levelNumberLabel!.string = levelNumber;
	}

	public applyBackSide(placeholderSpriteFrame: SpriteFrame | null) {
        if (!placeholderSpriteFrame) {
            throw new Error('Placeholder sprite frame is not provided.');
        }
		this.backsideSprite!.node.active = true;
		this.frontsideSprite!.node.active = false;
		this.backsideSprite!.spriteFrame = placeholderSpriteFrame;
	}

	public applyFrontSide(completedSpriteFrame: SpriteFrame | null) {
        if (!completedSpriteFrame) {
            throw new Error('Completed sprite frame is not provided.');
        }

		this.backsideSprite!.node.active = false;
		this.frontsideSprite!.node.active = true;
		this.frontsideSprite!.spriteFrame = completedSpriteFrame;
	}
}