import { _decorator, Color, Component, Label, Sprite, SpriteFrame, Node, Layout } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('LeaderboardRowUI')
export class LeaderboardRowUI extends Component {
    @property(Label)
    private rankLabel!: Label;

    @property(Sprite)
    private rankSprite: Sprite | null = null;

    @property(Sprite)
    private avatarSprite: Sprite | null = null;

    @property(SpriteFrame)
    private rankFirstSpriteFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    private rankSecondSpriteFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    private rankThirdSpriteFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    private borderPlayerSpriteFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    private borderDefaultSpriteFrame: SpriteFrame | null = null;

    @property(Sprite)
    private borderSprite: Sprite | null = null;

    @property(Label)
    private nameLabel: Label | null = null;

    @property(Label)
    private scoreLabel: Label | null = null;

    @property(Sprite)
    private backgroundSprite: Sprite | null = null;

    public setData(rank: number, name: string, score: string, avatarImage: SpriteFrame): void {
        if (this.rankSprite) {
            switch (rank) {
                case 1:
                    this.rankSprite.node.active = true;
                    this.rankSprite.spriteFrame = this.rankFirstSpriteFrame;
                    break;
                case 2:
                    this.rankSprite.node.active = true;
                    this.rankSprite.spriteFrame = this.rankSecondSpriteFrame;
                    break;
                case 3:
                    this.rankSprite.node.active = true;
                    this.rankSprite.spriteFrame = this.rankThirdSpriteFrame;
                    break;
                default:
                    this.rankLabel!.node.active = true;
                    this.rankSprite.node.active = false;
                    this.rankSprite.spriteFrame = null;
                    break;
            }
        }

        this.avatarSprite!.spriteFrame = avatarImage;

        if (this.rankLabel) {
            this.rankLabel.string = `${rank}`;
        }

        if (this.nameLabel) {
            this.nameLabel.string = name;
        }

        if (this.scoreLabel) {
            this.scoreLabel.string = score;
        }
    }

    public setHighlighted(highlighted: boolean): void {
        if (!this.backgroundSprite) {
            return;
        }

        if (highlighted) {
            this.borderSprite!.spriteFrame = this.borderPlayerSpriteFrame;
        } else {
            this.borderSprite!.spriteFrame = this.borderDefaultSpriteFrame;
        }
    }
}