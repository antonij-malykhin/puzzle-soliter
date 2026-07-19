import { _decorator, Color, Label, Node, UITransform } from 'cc';
import { UIView } from '../Base/UIView';

const { ccclass } = _decorator;

@ccclass('PauseUI')
export class PauseUI extends UIView {
	protected onLoad(): void {
		super.onLoad();
		if (this.node.children.length > 0) {
			return;
		}

		const labelNode = new Node('PauseLabel');
		labelNode.setParent(this.node);
		labelNode.setPosition(0, 80, 0);
		const transform = labelNode.addComponent(UITransform);
		transform.setContentSize(480, 80);

		const label = labelNode.addComponent(Label);
		label.fontSize = 36;
		label.horizontalAlign = Label.HorizontalAlign.CENTER;
		label.color = new Color(255, 220, 120, 255);
		label.string = 'PAUSED';
	}
}
