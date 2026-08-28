export const MUSIC_TRACK_IDS = {
    LOBBY_THEME: 'background1-mickeyscat-moment-of-peace-mickeyscat-cutted',
    GAMEPLAY_THEME_1: 'background2-alex-morgan-cutted',
    GAMEPLAY_THEME_2: 'background3-absolutesound-jazz-cutted',
    GAMEPLAY_THEME_3: 'background4-ikoliks_aj-cutted',
} as const;

export const SFX_IDS = {
    PICK_UP: 'tem-pick-up-cutted',
    MERGE: 'merge1-sound-cutted',
    UI_CLICK: 'juniorsoundays-ui-sound-12-cutted',
    BELL_DING: 'cartoon_music-bell-high-ding-cutted',
    WINNER: 'winner-game-sound-cutted',
} as const;

export type MusicTrackId = (typeof MUSIC_TRACK_IDS)[keyof typeof MUSIC_TRACK_IDS];
export type SfxId = (typeof SFX_IDS)[keyof typeof SFX_IDS];

export const MUSIC_PLAYLIST_IDS: ReadonlyArray<MusicTrackId> = [
    MUSIC_TRACK_IDS.LOBBY_THEME,
    MUSIC_TRACK_IDS.GAMEPLAY_THEME_1,
    MUSIC_TRACK_IDS.GAMEPLAY_THEME_2,
    MUSIC_TRACK_IDS.GAMEPLAY_THEME_3,
];

export const DEFAULT_LOBBY_MUSIC_ID: MusicTrackId = MUSIC_TRACK_IDS.LOBBY_THEME;
