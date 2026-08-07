import { Node, tween, Tween, UIOpacity, Vec3 } from 'cc';

export class LobbyCurrentLevelCardAnimation {
    private readonly pulseDurationSeconds: number = 0.8;
    private readonly minOpacity: number = 180;
    private readonly maxOpacity: number = 255;
    private readonly minScale: number = 1;
    private readonly maxScale: number = 1.08;

    private opacityTween: Tween<UIOpacity> | null = null;
    private scaleTween: Tween<Node> | null = null;

    public constructor(private readonly node: Node) {}

    public play(): void {
        this.stop();

        const opacity = this.ensureOpacity();

        this.opacityTween = tween(opacity)
            .to(this.pulseDurationSeconds / 2, { opacity: this.minOpacity })
            .to(this.pulseDurationSeconds / 2, { opacity: this.maxOpacity })
            .union()
            .repeatForever()
            .start();

        this.scaleTween = tween(this.node)
            .to(this.pulseDurationSeconds / 2, { scale: new Vec3(this.maxScale, this.maxScale, 1) })
            .to(this.pulseDurationSeconds / 2, { scale: new Vec3(this.minScale, this.minScale, 1) })
            .union()
            .repeatForever()
            .start();
    }

    public stop(): void {
        this.opacityTween?.stop();
        this.opacityTween = null;

        this.scaleTween?.stop();
        this.scaleTween = null;
    }

    private ensureOpacity(): UIOpacity {
        let opacity = this.node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = this.node.addComponent(UIOpacity);
        }

        return opacity;
    }
}
