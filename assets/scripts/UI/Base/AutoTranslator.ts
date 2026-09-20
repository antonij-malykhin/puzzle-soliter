import { _decorator, Component, Label } from 'cc';
import { EventBus } from '../../Core/Events/EventBus';
import { GameEventMap } from '../../Core/Events/GameEventMap';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { LocalizationManager } from '../../Managers/LocalizationManager';

const { ccclass, property } = _decorator;

@ccclass('AutoTranslator')
export class AutoTranslator extends Component {
    @property({ visible: false })
    private _translationKey: string = '';

    @property({ type: Label })
    private label: Label | null = null;

    private settingsSubscription: (() => void) | null = null;

    public get translationKey(): string {
        return this._translationKey;
    }

    @property({ visible: true, displayName: 'Translation Key' })
    public set translationKey(value: string) {
        this._translationKey = value;
        this.refreshText();
    }

    protected onEnable(): void {
        this.refreshText();
        this.subscribeToLanguageChanges();
    }

    protected onDisable(): void {
        this.settingsSubscription?.();
        this.settingsSubscription = null;
    }

    public refreshText(): void {
        const label = this.requireLabel();
        const key = this._translationKey.trim();

        if (key.length === 0) {
            label.string = '';
            return;
        }

        label.string = this.translate(key);
    }

    private subscribeToLanguageChanges(): void {
        if (this.settingsSubscription !== null) {
            return;
        }

        try {
            const eventBus = ServiceContainer.get<EventBus<GameEventMap>>(EventBus);
            this.settingsSubscription = eventBus.on('SettingsChanged', () => this.refreshText());
        } catch {
            this.settingsSubscription = null;
        }
    }

    private translate(key: string): string {
        try {
            return ServiceContainer.get(LocalizationManager).t(key);
        } catch {
            return key;
        }
    }

    private requireLabel(): Label {
        if (!this.label) {
            throw new Error('AutoTranslator requires Label component.');
        }

        return this.label;
    }
}
