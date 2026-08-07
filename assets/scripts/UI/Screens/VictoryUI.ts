import { _decorator, Button, ParticleSystem2D } from 'cc';
import { UIView } from '../Base/UIView';

const { ccclass, property } = _decorator;

@ccclass('VictoryUI')
export class VictoryUI extends UIView {
    @property(Button)
    private nextButton: Button | null = null;

    @property([ParticleSystem2D])
    private particlesEffect: Array<ParticleSystem2D> = [];

    private nextHandler: (() => void) | null = null;

    protected onLoad(): void {
        super.onLoad();
        this.bindNextButton();
    }

    public setNextHandler(handler: () => void): void {
        this.nextHandler = handler;
    }

    override async show(): Promise<void> {
        await super.show();
        this.particlesEffect.forEach(effect => effect.resetSystem());
    }

    private bindNextButton(): void {
        if (!this.nextButton) {
            return;
        }

        this.nextButton.node.off(Button.EventType.CLICK, this.onNextClicked, this);
        this.nextButton.node.on(Button.EventType.CLICK, this.onNextClicked, this);
    }

    private onNextClicked(): void {
        this.nextHandler?.();
    }
}
