import { _decorator, Component, Label, Node, Tween, tween } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('LoadingHUD')
export class LoadingHUD extends Component {
	@property(Node)
	private overlayRoot: Node | null = null;

	@property(Label)
	private messageLabel: Label | null = null;

	@property(Node)
	private spinnerNode: Node | null = null;

	private spinTween: Tween<Node> | null = null;

	public show(message?: string): void {
		if (!this.overlayRoot) {
			throw new Error('LoadingHUD: overlayRoot is not set.');
		}

		if (message !== undefined) {
			this.setMessage(message);
		}

		this.overlayRoot.active = true;
		this.startSpinner();
	}

	public setMessage(text: string): void {
		if (!this.messageLabel) {
			throw new Error('LoadingHUD: messageLabel is not set.');
		}

		this.messageLabel.string = text;
	}

	public hide(): void {
		if (!this.overlayRoot) {
			throw new Error('LoadingHUD: overlayRoot is not set.');
		}

		this.stopSpinner();
		this.overlayRoot.active = false;
	}

	private startSpinner(): void {
		if (!this.spinnerNode) {
			return;
		}

		this.stopSpinner();
		this.spinTween = tween(this.spinnerNode)
			.by(1, { angle: 360 })
			.repeatForever()
			.start();
	}

	private stopSpinner(): void {
		this.spinTween?.stop();
		this.spinTween = null;
	}
}