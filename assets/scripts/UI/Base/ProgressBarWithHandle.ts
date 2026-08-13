import { ProgressBar, Node, _decorator, UITransform } from "cc";

const { ccclass, property } = _decorator;

@ccclass("ProgressBarWithHandle")
export class ProgressBarWithHandle extends ProgressBar {
    @property(Node)
    private handle: Node | null = null;

    protected _updateBarStatus() {
        super._updateBarStatus();

        if (!this.handle || !this._barSprite) return;

        const newXPosition = this._barSprite.node.getComponent(UITransform)?.contentSize.width!;
        this.handle.setPosition(newXPosition + this._barSprite.node.position.x + this.handle.getComponent(UITransform)?.contentSize.width! / 2, this.handle.position.y);
    }
}