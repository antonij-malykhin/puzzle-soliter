import { _decorator, Color, Component, Label, Sprite } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('LeaderboardRowUI')
export class LeaderboardRowUI extends Component {
    @property(Label)
    private rankLabel: Label | null = null;

    @property(Label)
    private nameLabel: Label | null = null;

    @property(Label)
    private scoreLabel: Label | null = null;

    @property(Sprite)
    private backgroundSprite: Sprite | null = null;

    @property(Color)
    private highlightColor: Color = new Color(255, 220, 90, 120);

    public setData(rank: number, name: string, score: string): void {
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

        this.backgroundSprite.node.active = highlighted;
        if (highlighted) {
            this.backgroundSprite.color = this.highlightColor;
        }
    }
}