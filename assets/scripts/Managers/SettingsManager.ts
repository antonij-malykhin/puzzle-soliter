import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { GameSettings } from '../Data/Models/GameSettings';
import { SaveManager } from './SaveManager';

export class SettingsManager {
    private settings: GameSettings | null = null;

    public constructor(
        private readonly saveManager: SaveManager,
        private readonly eventBus: EventBus<GameEventMap>,
    ) {}

    public async initialize(): Promise<void> {
        this.settings = await this.saveManager.loadSettings();
        this.eventBus.emit('SettingsChanged', { settings: this.settings });
    }

    public getSettings(): GameSettings {
        if (!this.settings) {
            throw new Error('SettingsManager is not initialized.');
        }

        return this.settings;
    }

    public async updateSettings(nextSettings: GameSettings): Promise<void> {
        this.settings = nextSettings;
        await this.saveManager.saveSettings(nextSettings);
        this.eventBus.emit('SettingsChanged', { settings: nextSettings });
    }
}
