import { _decorator, Slider, UITransform } from "cc";

const { ccclass, property } = _decorator;

@ccclass("SliderWithFill")
export class SliderWithFill extends Slider {
    @property(UITransform)
    private fillUITransform: UITransform | null | undefined;

    protected _updateHandlePosition() {
        super._updateHandlePosition();
        this.fillUITransform?.setContentSize(
            this.handle?.node.position.x! - this.fillUITransform?.node.position.x!, 
            this.fillUITransform?.contentSize.height!);
    }
}