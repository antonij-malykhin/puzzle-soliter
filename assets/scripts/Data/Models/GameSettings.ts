import {
    DEFAULT_MUSIC_VOLUME,
    DEFAULT_SFX_VOLUME,
    DEFAULT_SNAP_THRESHOLD,
} from '../../Core/Config/GameConstants';

export interface GameSettings {
    language: string;
    musicVolume: number;
    sfxVolume: number;
    vibrationEnabled: boolean;
    autoSnapEnabled: boolean;
    snapThreshold: number;
}

export const createDefaultGameSettings = (): GameSettings => ({
    language: 'en',
    musicVolume: DEFAULT_MUSIC_VOLUME,
    sfxVolume: DEFAULT_SFX_VOLUME,
    vibrationEnabled: true,
    autoSnapEnabled: true,
    snapThreshold: DEFAULT_SNAP_THRESHOLD,
});
