import { _decorator, Camera, Component, Node, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('CameraController')
export class CameraController extends Component {
    @property(Camera)
    private camera: Camera | null = null;

    @property
    private minOrthoHeight = 200;

    @property
    private maxOrthoHeight = 800;

    @property
    private zoomTweenDurationSeconds = 0.15;

    public zoomBy(delta: number): void {
        if (!this.camera) {
            return;
        }

        const target = this.clamp(this.camera.orthoHeight + delta, this.minOrthoHeight, this.maxOrthoHeight);
        tween(this.camera)
            .to(this.zoomTweenDurationSeconds, { orthoHeight: target })
            .start();
    }

    public panBy(deltaX: number, deltaY: number): void {
        const currentPosition = this.node.getPosition();
        this.node.setPosition(new Vec3(currentPosition.x + deltaX, currentPosition.y + deltaY, currentPosition.z));
    }

    public focusOn(targetNode: Node): void {
        const targetPosition = targetNode.getPosition();
        const currentPosition = this.node.getPosition();
        this.node.setPosition(new Vec3(targetPosition.x, targetPosition.y, currentPosition.z));
    }

    public resetView(defaultOrthoHeight: number, defaultPosition: Vec3): void {
        if (this.camera) {
            this.camera.orthoHeight = this.clamp(defaultOrthoHeight, this.minOrthoHeight, this.maxOrthoHeight);
        }

        this.node.setPosition(defaultPosition);
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
}
