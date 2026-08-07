import { _decorator, Button, Node, ProgressBar } from 'cc';
import { GameSettings } from '../../Data/Models/GameSettings';
import { UIView } from '../Base/UIView';

const { ccclass, property } = _decorator;

@ccclass('SettingsUI')
export class SettingsUI extends UIView {
    @property(Button)
    private settingsButton: Button | null = null;

    @property(Node)
    private settingsPanel: Node | null = null;

    @property(Button)
    private closeButton: Button | null = null;

    @property(ProgressBar)
    private musicVolumeBar: ProgressBar | null = null;

    @property(ProgressBar)
    private sfxVolumeBar: ProgressBar | null = null;

    protected onLoad(): void {
        super.onLoad();
        if (!this.settingsButton) {
            throw new Error('Settings button is not assigned.');
        }

        this.settingsButton.node.on('click', this.onSettingsButtonClicked, this);
        this.closeButton?.node.on('click', this.onCloseButtonClicked, this);
    }

    private onCloseButtonClicked(): void {
        if (!this.settingsPanel) {
            throw new Error('Settings panel is not assigned.');
        }

        this.settingsPanel.active = false;
    }
    
    private onSettingsButtonClicked(): void {
        this.showSettingsPanel();
    }

    private showSettingsPanel(): void {
        if (!this.settingsPanel) {
            throw new Error('Settings panel is not assigned.');
        }

        this.settingsPanel.active = true;
    }

    public setSettings(settings: GameSettings): void {
        if (!this.settingsButton) {
            return;
        }
    }
}
