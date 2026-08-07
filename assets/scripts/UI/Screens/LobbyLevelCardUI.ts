import { _decorator, Component, Label, Sprite, SpriteFrame, UITransform } from 'cc';
import { LobbyLevelCardPresentation } from '../../Data/Models/LobbyLevelCardPresentation';
import { LobbyCurrentLevelCardAnimation } from '../Animation/LobbyCurrentLevelCardAnimation';

const { ccclass, property } = _decorator;

@ccclass('LobbyLevelCardUI')
export class LobbyLevelCardUI extends Component {
    @property(Sprite)
    public backsideSprite: Sprite | null = null;
    
    @property(Sprite)
    public frontsideSprite: Sprite | null = null;
    
    @property(Label)
    public levelNumberLabel: Label | null = null;

	@property(UITransform)
	public uiTransform: UITransform | null = null;

    private currentLevelAnimation: LobbyCurrentLevelCardAnimation | null = null;

	public render(card: LobbyLevelCardPresentation): void {
		this.setLevelNumberLabel(card.isCompleted && !card.shouldAnimateFlip ? '' : `${card.levelNumber}`);

		if (card.isCompleted && !card.shouldAnimateFlip) {
			this.applyFrontSide(card.frontSpriteFrame);
			this.uiTransform?.setContentSize(card.width, card.height);
			return;
		}

		this.applyBackSide(card.backSpriteFrame);
		this.uiTransform?.setContentSize(card.width, card.height);
	}

	public setLevelNumberLabel(levelNumber: string): void {
		this.levelNumberLabel!.string = levelNumber;
	}

	public applyBackSide(backSpriteFrame: SpriteFrame | null): void {
		this.backsideSprite!.node.active = true;
		this.frontsideSprite!.node.active = false;

		if (backSpriteFrame) {
			this.backsideSprite!.spriteFrame = backSpriteFrame;
		}
	}

	public applyFrontSide(frontSpriteFrame: SpriteFrame | null): void {
		if (!frontSpriteFrame) {
			throw new Error('Front sprite frame is not provided.');
		}

		this.backsideSprite!.node.active = false;
		this.frontsideSprite!.node.active = true;
		this.frontsideSprite!.spriteFrame = frontSpriteFrame;
	}

    public playCurrentLevelAnimation(): void {
        if (!this.currentLevelAnimation) {
            this.currentLevelAnimation = new LobbyCurrentLevelCardAnimation(this.node);
        }

        this.currentLevelAnimation.play();
    }

    protected onDestroy(): void {
        this.currentLevelAnimation?.stop();
    }
}