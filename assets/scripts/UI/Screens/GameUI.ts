import { _decorator, Label } from 'cc';
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
}
