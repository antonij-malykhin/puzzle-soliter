import { _decorator, Color, Label, Node, UITransform } from 'cc';
import { UIView } from '../Base/UIView';

const { ccclass, property } = _decorator;

@ccclass('GameUI')
export class GameUI extends UIView {
    @property(Label)
    private levelLabel: Label | null = null;

    @property(Label)
    private progressLabel: Label | null = null;

    protected onLoad(): void {
        super.onLoad();
        this.levelLabel = this.levelLabel ?? this.createLabelNode('LevelLabel', 0, 180, 'Level: -');
        this.progressLabel = this.progressLabel ?? this.createLabelNode('ProgressLabel', 0, 145, 'Placed: 0/0');
    }

    public setLevel(levelId: string): void {
        if (this.levelLabel) {
            this.levelLabel.string = `Level: ${levelId}`;
        }
    }

    public setProgress(lockedPieces: number, totalPieces: number): void {
        if (this.progressLabel) {
            this.progressLabel.string = `Placed: ${lockedPieces}/${totalPieces}`;
        }
    }

    private createLabelNode(name: string, x: number, y: number, text: string): Label {
        const labelNode = new Node(name);
        labelNode.setParent(this.node);
        labelNode.setPosition(x, y, 0);
        const transform = labelNode.addComponent(UITransform);
        transform.setContentSize(500, 40);

        const label = labelNode.addComponent(Label);
        label.fontSize = 24;
        label.color = new Color(255, 255, 255, 255);
        label.string = text;
        return label;
    }
}
