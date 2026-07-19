import { GameSettings } from '../Data/Models/GameSettings';

export class AudioManager {
    private musicVolume = 1;
    private sfxVolume = 1;

    public applySettings(settings: GameSettings): void {
        this.musicVolume = settings.musicVolume;
        this.sfxVolume = settings.sfxVolume;
    }

    public playSfx(_sfxId: string): void {
        // MVP placeholder
    }

    public playMusic(_musicId: string): void {
        // MVP placeholder
    }

    public stopMusic(): void {
        // MVP placeholder
    }

    public getMusicVolume(): number {
        return this.musicVolume;
    }

    public getSfxVolume(): number {
        return this.sfxVolume;
    }
}
