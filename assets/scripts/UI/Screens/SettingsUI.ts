import { _decorator, Color, Label, Node, UITransform } from 'cc';
import { GameSettings } from '../../Data/Models/GameSettings';
import { UIView } from '../Base/UIView';

const { ccclass, property } = _decorator;

@ccclass('SettingsUI')
export class SettingsUI extends UIView {
    @property(Label)
    private settingsLabel: Label | null = null;

    protected onLoad(): void {
        super.onLoad();
        this.settingsLabel = this.settingsLabel ?? this.createLabelNode();
    }

    public setSettings(settings: GameSettings): void {
        if (!this.settingsLabel) {
            return;
        }

        this.settingsLabel.string = [
            `Lang: ${settings.language}`,
            `Music: ${settings.musicVolume.toFixed(2)}`,
            `SFX: ${settings.sfxVolume.toFixed(2)}`,
            `Snap: ${settings.autoSnapEnabled ? 'ON' : 'OFF'}`,
        ].join('\n');
    }

    private createLabelNode(): Label {
        const labelNode = new Node('SettingsLabel');
        labelNode.setParent(this.node);
        labelNode.setPosition(-500, 210, 0);
        const transform = labelNode.addComponent(UITransform);
        transform.setContentSize(320, 130);

        const label = labelNode.addComponent(Label);
        label.fontSize = 18;
        label.lineHeight = 22;
        label.color = new Color(235, 235, 235, 255);
        label.string = 'Settings';
        return label;
    }
}
