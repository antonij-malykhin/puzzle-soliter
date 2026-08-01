import {
    _decorator,
    Component,
    Graphics,
    Color,
    tween,
    Tween,
    Vec2,
    CCFloat
} from 'cc';

const { ccclass, property, requireComponent } = _decorator;

export enum BorderMask {
    None = 0,
    Top = 1 << 0,
    Right = 1 << 1,
    Bottom = 1 << 2,
    Left = 1 << 3,
    All = Top | Right | Bottom | Left
}

interface SideState {
    current: number;
    target: number;
}

@ccclass('PuzzleBorderRenderer')
@requireComponent(Graphics)
export class PuzzleBorderRenderer extends Component {

    @property(Color)
    color = Color.WHITE.clone();

    @property(CCFloat)
    lineWidth = 4;

    @property(CCFloat)
    duration = 0.15;

    @property(CCFloat)
    inset = 1;

    private graphics!: Graphics;

    private width = 0;
    private height = 0;

    private top: SideState = { current: 1, target: 1 };
    private right: SideState = { current: 1, target: 1 };
    private bottom: SideState = { current: 1, target: 1 };
    private left: SideState = { current: 1, target: 1 };

    protected onLoad() {

        this.graphics = this.getComponent(Graphics)!;

        const ui = this.node.getComponent('UITransform') as any;

        this.width = ui.width;
        this.height = ui.height;

        this.graphics.strokeColor = this.color;
        this.graphics.lineWidth = this.lineWidth;

        this.draw();
    }

    public setMask(mask: BorderMask, animate = true) {

        this.animateSide(this.top, (mask & BorderMask.Top) != 0, animate);
        this.animateSide(this.right, (mask & BorderMask.Right) != 0, animate);
        this.animateSide(this.bottom, (mask & BorderMask.Bottom) != 0, animate);
        this.animateSide(this.left, (mask & BorderMask.Left) != 0, animate);
    }

    private animateSide(
        side: SideState,
        visible: boolean,
        animate: boolean
    ) {

        side.target = visible ? 1 : 0;

        Tween.stopAllByTarget(side);

        if (!animate) {
            side.current = side.target;
            this.draw();
            return;
        }

        tween(side)
            .to(this.duration,
                {
                    current: side.target
                },
                {
                    easing: 'quadOut',
                    onUpdate: () => this.draw()
                })
            .start();
    }

    private draw() {

        const g = this.graphics;

        g.clear();

        g.strokeColor = this.color;
        g.lineWidth = this.lineWidth;

        const hw = this.width * 0.5 - this.inset;
        const hh = this.height * 0.5 - this.inset;

        this.drawHorizontal(-hw, hh, hw, this.top.current);

        this.drawVertical(hw, hh, -hh, this.right.current);

        this.drawHorizontal(hw, -hh, -hw, this.bottom.current);

        this.drawVertical(-hw, -hh, hh, this.left.current);
    }

    private drawHorizontal(
        x1: number,
        y: number,
        x2: number,
        progress: number
    ) {

        if (progress <= 0.001)
            return;

        const center = (x1 + x2) * 0.5;
        const half = Math.abs(x2 - x1) * progress * 0.5;

        this.graphics.moveTo(center - half, y);
        this.graphics.lineTo(center + half, y);
        this.graphics.stroke();
    }

    private drawVertical(
        x: number,
        y1: number,
        y2: number,
        progress: number
    ) {

        if (progress <= 0.001)
            return;

        const center = (y1 + y2) * 0.5;
        const half = Math.abs(y2 - y1) * progress * 0.5;

        this.graphics.moveTo(x, center - half);
        this.graphics.lineTo(x, center + half);
        this.graphics.stroke();
    }
}