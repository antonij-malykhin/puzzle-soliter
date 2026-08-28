import { _decorator, Button, Node, ProgressBar, Slider } from 'cc';
import { GameEventMap } from '../../Core/Events/GameEventMap';
import { GameSettings } from '../../Data/Models/GameSettings';
import { UIView } from '../Base/UIView';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { EventBus } from '../../Core/Events/EventBus';
import { SettingsManager } from '../../Managers/SettingsManager';

const { ccclass, property } = _decorator;

@ccclass('SettingsUI')
export class SettingsUI extends UIView {
    @property(Button)
    private settingsButton: Button | null = null;

    @property(Node)
    private settingsPanel: Node | null = null;

    @property(Button)
    private closeButton: Button | null = null;

    @property(Slider)
    private musicVolumeSlider: Slider | null = null;

    @property(Slider)
    private sfxVolumeSlider: Slider | null = null;

    protected onLoad(): void {
        super.onLoad();
        if (!this.settingsButton) {
            throw new Error('Settings button is not assigned.');
        }

        this.settingsButton.node.on('click', this.onSettingsButtonClicked, this);
        this.closeButton?.node.on('click', this.onCloseButtonClicked, this);
        this.musicVolumeSlider?.node.on('slide', this.onMusicVolumeChanged, this);
        this.sfxVolumeSlider?.node.on('slide', this.onSFXVolumeChanged, this);
        const settings = ServiceContainer.get(SettingsManager).getSettings();
        this.setSettings(settings);
    }

    private onMusicVolumeChanged(slider: Slider): void {
        const volume = slider.progress;
        ServiceContainer.get(EventBus<GameEventMap>).emit('MusicVolumeChanged', { volume });
    }

    private onSFXVolumeChanged(slider: Slider): void {
        const volume = slider.progress;
        ServiceContainer.get(EventBus<GameEventMap>).emit('SFXVolumeChanged', { volume });
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

        this.musicVolumeSlider!.progress = settings.musicVolume;
        this.sfxVolumeSlider!.progress = settings.sfxVolume;
    }
}
