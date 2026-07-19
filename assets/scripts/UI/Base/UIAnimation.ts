import { tween, UIOpacity, Vec3, Node } from 'cc';

export class UIAnimation {
    public constructor(
        private readonly node: Node,
        private readonly durationSeconds: number,
    ) {}

    public playShow(): Promise<void> {
        return new Promise<void>((resolve) => {
            const opacity = this.ensureOpacity();
            this.node.active = true;
            this.node.setScale(new Vec3(0.96, 0.96, 1));
            opacity.opacity = 0;

            tween(opacity)
                .to(this.durationSeconds, { opacity: 255 })
                .start();

            tween(this.node)
                .to(this.durationSeconds, { scale: new Vec3(1, 1, 1) })
                .call(() => resolve())
                .start();
        });
    }

    public playHide(): Promise<void> {
        return new Promise<void>((resolve) => {
            const opacity = this.ensureOpacity();

            tween(opacity)
                .to(this.durationSeconds, { opacity: 0 })
                .call(() => {
                    this.node.active = false;
                    resolve();
                })
                .start();
        });
    }

    private ensureOpacity(): UIOpacity {
        let opacity = this.node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = this.node.addComponent(UIOpacity);
        }

        return opacity;
    }
}
