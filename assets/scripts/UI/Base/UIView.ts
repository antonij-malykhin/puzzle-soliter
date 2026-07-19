import { _decorator, Component } from 'cc';
import { UIAnimation } from './UIAnimation';

const { ccclass, property } = _decorator;

@ccclass('UIView')
export class UIView extends Component {
    @property
    private transitionDurationSeconds = 0.15;

    private animation: UIAnimation | null = null;

    protected onLoad(): void {
        this.animation = new UIAnimation(this.node, this.transitionDurationSeconds);
    }

    public async show(): Promise<void> {
        if (!this.animation) {
            this.node.active = true;
            return;
        }

        await this.animation.playShow();
    }

    public async hide(): Promise<void> {
        if (!this.animation) {
            this.node.active = false;
            return;
        }

        await this.animation.playHide();
    }
}
