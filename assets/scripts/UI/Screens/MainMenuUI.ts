import { _decorator, Color, Label, Node, UITransform } from 'cc';
import { UIView } from '../Base/UIView';

const { ccclass } = _decorator;

@ccclass('MainMenuUI')
export class MainMenuUI extends UIView {
	protected onLoad(): void {
		super.onLoad();
		if (this.node.children.length > 0) {
			return;
		}

		const titleNode = new Node('MainTitle');
		titleNode.setParent(this.node);
		titleNode.setPosition(0, 140, 0);
		const transform = titleNode.addComponent(UITransform);
		transform.setContentSize(760, 100);

		const label = titleNode.addComponent(Label);
		label.fontSize = 44;
		label.horizontalAlign = Label.HorizontalAlign.CENTER;
		label.color = new Color(255, 255, 255, 255);
		label.string = 'Mosaic Puzzle';
	}
}
