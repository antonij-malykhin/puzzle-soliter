import { _decorator, Button, Color, Label, Node, UITransform, director } from 'cc';
import { UIView } from '../Base/UIView';

const { ccclass, property } = _decorator;

@ccclass('VictoryUI')
export class VictoryUI extends UIView {
    private static readonly RESULT_LABEL_WIDTH = 650;
    private static readonly RESULT_LABEL_HEIGHT = 80;
    private static readonly RESULT_LABEL_FONT_SIZE = 34;
    private static readonly RESULT_LABEL_LINE_HEIGHT = 38;

    private static readonly RESTART_BUTTON_WIDTH = 240;
    private static readonly RESTART_BUTTON_HEIGHT = 72;
    private static readonly RESTART_BUTTON_Y = -90;
    private static readonly RESTART_LABEL_FONT_SIZE = 30;
    private static readonly RESTART_LABEL_LINE_HEIGHT = 34;

    private static readonly RESULT_TEXT_PREFIX = 'Victory!';
    private static readonly RESTART_TEXT = 'Restart';
    private static readonly NEXT_BUTTON_WIDTH = 240;
    private static readonly NEXT_BUTTON_HEIGHT = 72;
    private static readonly NEXT_BUTTON_Y = -180;
    private static readonly NEXT_LABEL_FONT_SIZE = 30;
    private static readonly NEXT_LABEL_LINE_HEIGHT = 34;
    private static readonly NEXT_TEXT = 'Next';

    @property(Label)
    private resultLabel: Label | null = null;

    @property(Button)
    private restartButton: Button | null = null;

    @property(Button)
    private nextButton: Button | null = null;

    private restartHandler: (() => void) | null = null;
    private nextHandler: (() => void) | null = null;

    protected onLoad(): void {
        super.onLoad();
        this.resultLabel = this.resultLabel ?? this.createLabelNode();
        this.restartButton = this.restartButton ?? this.createRestartButtonNode();
        this.nextButton = this.nextButton ?? this.createNextButtonNode();
        this.bindRestartButton();
        this.bindNextButton();
    }

    public setResult(levelId: string, elapsedSeconds: number): void {
        if (!this.resultLabel) {
            return;
        }

        this.resultLabel.string = `${VictoryUI.RESULT_TEXT_PREFIX} ${levelId} in ${elapsedSeconds}s`;
    }

    public setRestartHandler(handler: () => void): void {
        this.restartHandler = handler;
    }

    public setNextHandler(handler: () => void): void {
        this.nextHandler = handler;
    }

    private bindRestartButton(): void {
        if (!this.restartButton) {
            return;
        }

        this.restartButton.node.off(Button.EventType.CLICK, this.onRestartClicked, this);
        this.restartButton.node.on(Button.EventType.CLICK, this.onRestartClicked, this);
    }

    private bindNextButton(): void {
        if (!this.nextButton) {
            return;
        }

        this.nextButton.node.off(Button.EventType.CLICK, this.onNextClicked, this);
        this.nextButton.node.on(Button.EventType.CLICK, this.onNextClicked, this);
    }

    private onRestartClicked(): void {
        if (this.restartHandler) {
            this.restartHandler();
            return;
        }

        this.restartCurrentScene();
    }

    private onNextClicked(): void {
        this.nextHandler?.();
    }

    private restartCurrentScene(): void {
        const currentScene = director.getScene();
        if (!currentScene) {
            return;
        }

        director.loadScene(currentScene.name);
    }

    private createLabelNode(): Label {
        const labelNode = new Node('VictoryLabel');
        labelNode.setParent(this.node);
        labelNode.setPosition(0, 0, 0);

        const transform = labelNode.addComponent(UITransform);
        transform.setContentSize(VictoryUI.RESULT_LABEL_WIDTH, VictoryUI.RESULT_LABEL_HEIGHT);

        const label = labelNode.addComponent(Label);
        label.fontSize = VictoryUI.RESULT_LABEL_FONT_SIZE;
        label.lineHeight = VictoryUI.RESULT_LABEL_LINE_HEIGHT;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.color = new Color(250, 224, 100, 255);
        label.string = VictoryUI.RESULT_TEXT_PREFIX;

        return label;
    }

    private createRestartButtonNode(): Button {
        const buttonNode = new Node('RestartButton');
        buttonNode.setParent(this.node);
        buttonNode.setPosition(0, VictoryUI.RESTART_BUTTON_Y, 0);

        const buttonTransform = buttonNode.addComponent(UITransform);
        buttonTransform.setContentSize(VictoryUI.RESTART_BUTTON_WIDTH, VictoryUI.RESTART_BUTTON_HEIGHT);

        const button = buttonNode.addComponent(Button);

        const labelNode = new Node('Label');
        labelNode.setParent(buttonNode);
        labelNode.setPosition(0, 0, 0);

        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(VictoryUI.RESTART_BUTTON_WIDTH, VictoryUI.RESTART_BUTTON_HEIGHT);

        const label = labelNode.addComponent(Label);
        label.string = VictoryUI.RESTART_TEXT;
        label.fontSize = VictoryUI.RESTART_LABEL_FONT_SIZE;
        label.lineHeight = VictoryUI.RESTART_LABEL_LINE_HEIGHT;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = new Color(255, 255, 255, 255);

        return button;
    }

    private createNextButtonNode(): Button {
        const buttonNode = new Node('NextButton');
        buttonNode.setParent(this.node);
        buttonNode.setPosition(0, VictoryUI.NEXT_BUTTON_Y, 0);

        const buttonTransform = buttonNode.addComponent(UITransform);
        buttonTransform.setContentSize(VictoryUI.NEXT_BUTTON_WIDTH, VictoryUI.NEXT_BUTTON_HEIGHT);

        const button = buttonNode.addComponent(Button);

        const labelNode = new Node('Label');
        labelNode.setParent(buttonNode);
        labelNode.setPosition(0, 0, 0);

        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(VictoryUI.NEXT_BUTTON_WIDTH, VictoryUI.NEXT_BUTTON_HEIGHT);

        const label = labelNode.addComponent(Label);
        label.string = VictoryUI.NEXT_TEXT;
        label.fontSize = VictoryUI.NEXT_LABEL_FONT_SIZE;
        label.lineHeight = VictoryUI.NEXT_LABEL_LINE_HEIGHT;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = new Color(255, 255, 255, 255);

        return button;
    }
}
