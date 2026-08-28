import { GameSettings } from '../Data/Models/GameSettings';
import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
import { AudioClip, AudioSource, Game, Node, Tween, director, game, tween } from 'cc';
import { IAudioClipProvider } from '../Data/Interfaces/IAudioClipProvider';
import {
    DEFAULT_MUSIC_VOLUME,
    DEFAULT_SFX_VOLUME,
    MUSIC_RESOURCE_PATH,
    SFX_RESOURCE_PATH,
} from '../Core/Config/GameConstants';
import { SFX_IDS } from '../Core/Config/AudioIds';

export class AudioManager {
    private static readonly CROSSFADE_DURATION_SECONDS = 1.2;

    private musicVolume = DEFAULT_MUSIC_VOLUME;
    private sfxVolume = DEFAULT_SFX_VOLUME;
    private readonly clipProvider: IAudioClipProvider;
    private readonly rootNode: Node;
    private readonly musicNodes: [Node, Node];
    private readonly musicSources: [AudioSource, AudioSource];
    private readonly sfxSource: AudioSource;
    private activeMusicSourceIndex = 0;
    private currentMusicPath: string | null = null;
    private readonly suspensionReasons = new Set<string>();
    private musicRequestVersion = 0;
    private transitionVersion = 0;
    private playlistPaths: ReadonlyArray<string> = [];
    private playlistIndex = 0;
    private playlistEnabled = false;

    constructor(eventBus: EventBus<GameEventMap>, clipProvider: IAudioClipProvider) {
        this.clipProvider = clipProvider;
        this.rootNode = this.createAudioRootNode();
        this.musicNodes = [this.createMusicNode('MusicSourceA'), this.createMusicNode('MusicSourceB')];
        this.musicSources = [
            this.musicNodes[0].addComponent(AudioSource),
            this.musicNodes[1].addComponent(AudioSource),
        ];
        this.musicNodes[0].on(AudioSource.EventType.ENDED, this.onPrimaryMusicEnded, this);
        this.musicNodes[1].on(AudioSource.EventType.ENDED, this.onSecondaryMusicEnded, this);
        this.sfxSource = this.rootNode.addComponent(AudioSource);
        this.musicSources[0].loop = true;
        this.musicSources[1].loop = true;
        this.applyVolumeToSources();
        game.on(Game.EVENT_HIDE, this.onAppHidden, this);
        game.on(Game.EVENT_SHOW, this.onAppShown, this);

        eventBus.on('MusicVolumeChanged', this.onMusicVolumeChanged.bind(this));
        eventBus.on('SFXVolumeChanged', this.onSFXVolumeChanged.bind(this));
        eventBus.on('PiecesMerged', this.onPiecesMerged.bind(this));
        eventBus.on('PuzzleCompleted', this.onPuzzleCompleted.bind(this));
    }

    public initialize(settings: GameSettings): void {
        this.applySettings(settings);
    }

    public applySettings(settings: GameSettings): void {
        this.musicVolume = settings.musicVolume;
        this.sfxVolume = settings.sfxVolume;
        this.applyVolumeToSources();
    }

    public playSfx(sfxId: string): void {
        void this.playSfxInternal(sfxId);
    }

    public playMusic(musicId: string): void {
        this.playlistEnabled = false;
        this.playlistPaths = [];
        this.playlistIndex = 0;
        void this.playMusicInternal(musicId);
    }

    public playMusicPlaylist(musicIds: ReadonlyArray<string>, startIndex?: number): void {
        if (musicIds.length === 0) {
            console.warn('[AudioManager] Requested to play an empty music playlist.');
            return;
        }

        const normalizedPlaylist = musicIds.map((musicId) => this.resolveMusicPath(musicId));
        const requestedStartIndex = startIndex ?? this.pickRandomPlaylistIndex(normalizedPlaylist.length);
        const normalizedStartIndex = this.normalizePlaylistIndex(requestedStartIndex, normalizedPlaylist.length);

        if (this.playlistEnabled && this.hasSamePlaylist(normalizedPlaylist)) {
            const activeSource = this.getActiveMusicSource();
            if (this.suspensionReasons.size === 0 && activeSource.clip && !activeSource.playing) {
                activeSource.play();
            }

            return;
        }

        this.playlistEnabled = true;
        this.playlistPaths = normalizedPlaylist;
        this.playlistIndex = normalizedStartIndex;
        void this.playMusicByPath(this.playlistPaths[this.playlistIndex], false);
    }

    public pauseForAd(): void {
        this.suspendMusic('ad');
    }

    public resumeAfterAd(): void {
        this.resumeMusic('ad');
    }

    public stopMusic(): void {
        this.musicRequestVersion += 1;
        this.transitionVersion += 1;
        this.playlistEnabled = false;
        this.playlistPaths = [];
        this.playlistIndex = 0;
        this.stopMusicTransitions();
        this.musicSources.forEach((source) => {
            if (source.playing) {
                source.stop();
            }

            source.clip = null;
            source.volume = this.musicVolume;
        });

        this.currentMusicPath = null;
    }

    public getMusicVolume(): number {
        return this.musicVolume;
    }

    public getSfxVolume(): number {
        return this.sfxVolume;
    }

    private onMusicVolumeChanged(event: { volume: number }): void {
        this.musicVolume = this.normalizeVolume(event.volume);
        this.getActiveMusicSource().volume = this.musicVolume;
    }

    private onSFXVolumeChanged(event: { volume: number }): void {
        this.sfxVolume = this.normalizeVolume(event.volume);
        this.sfxSource.volume = this.sfxVolume;
    }

    private createAudioRootNode(): Node {
        const scene = director.getScene();
        if (!scene) {
            throw new Error('AudioManager requires an active scene to initialize audio sources.');
        }

        const audioRootNode = new Node('AudioManagerRoot');
        scene.addChild(audioRootNode);
        director.addPersistRootNode(audioRootNode);

        return audioRootNode;
    }

    private createMusicNode(name: string): Node {
        const node = new Node(name);
        this.rootNode.addChild(node);
        return node;
    }

    private applyVolumeToSources(): void {
        this.musicVolume = this.normalizeVolume(this.musicVolume);
        this.sfxVolume = this.normalizeVolume(this.sfxVolume);
        this.musicSources[0].volume = this.musicVolume;
        this.musicSources[1].volume = this.musicVolume;
        this.sfxSource.volume = this.sfxVolume;
    }

    private normalizeVolume(value: number): number {
        return Math.max(0, Math.min(1, value));
    }

    private suspendMusic(reason: string): void {
        this.suspensionReasons.add(reason);
        const activeSource = this.getActiveMusicSource();
        if (activeSource.playing) {
            activeSource.pause();
        }
    }

    private resumeMusic(reason: string): void {
        this.suspensionReasons.delete(reason);
        if (this.suspensionReasons.size > 0) {
            return;
        }

        const activeSource = this.getActiveMusicSource();
        if (activeSource.clip && !activeSource.playing) {
            activeSource.play();
        }
    }

    private onAppHidden(): void {
        this.suspendMusic('focus');
    }

    private onAppShown(): void {
        this.resumeMusic('focus');
    }

    private onPrimaryMusicEnded(): void {
        this.onMusicEnded(0);
    }

    private onSecondaryMusicEnded(): void {
        this.onMusicEnded(1);
    }

    private onMusicEnded(sourceIndex: number): void {
        if (sourceIndex !== this.activeMusicSourceIndex) {
            return;
        }

        if (!this.playlistEnabled || this.playlistPaths.length === 0) {
            return;
        }

        this.playlistIndex = (this.playlistIndex + 1) % this.playlistPaths.length;
        void this.playMusicByPath(this.playlistPaths[this.playlistIndex], false);
    }

    private async playMusicInternal(musicId: string): Promise<void> {
        const clipPath = this.resolveMusicPath(musicId);
        await this.playMusicByPath(clipPath, true);
    }

    private async playMusicByPath(clipPath: string, shouldLoop: boolean): Promise<void> {
        try {
            if (this.currentMusicPath === clipPath) {
                const activeSource = this.getActiveMusicSource();
                if (this.suspensionReasons.size === 0 && activeSource.clip && !activeSource.playing) {
                    activeSource.play();
                }

                return;
            }

            const requestVersion = ++this.musicRequestVersion;
            const clip = await this.clipProvider.getClip(clipPath);

            if (requestVersion !== this.musicRequestVersion) {
                return;
            }

            const activeSource = this.getActiveMusicSource();
            this.currentMusicPath = clipPath;

            const hasPlayingMusic = this.musicSources.some((source) => source.playing);
            if (!hasPlayingMusic && !activeSource.clip) {
                activeSource.clip = clip;
                activeSource.volume = this.musicVolume;
                activeSource.loop = shouldLoop;
                if (this.suspensionReasons.size === 0) {
                    activeSource.play();
                }

                return;
            }

            await this.crossfadeToClip(clip, shouldLoop);
        } catch (error) {
            console.warn(`[AudioManager] Failed to play music "${clipPath}".`, error);
        }
    }

    private async crossfadeToClip(nextClip: AudioClip, shouldLoop: boolean): Promise<void> {
        const previousSourceIndex = this.activeMusicSourceIndex;
        const nextSourceIndex = this.getInactiveMusicSourceIndex();
        const previousSource = this.musicSources[previousSourceIndex];
        const nextSource = this.musicSources[nextSourceIndex];
        const transitionId = ++this.transitionVersion;

        this.stopMusicTransitions();

        nextSource.stop();
        nextSource.clip = nextClip;
        nextSource.loop = shouldLoop;
        nextSource.volume = 0;

        if (this.suspensionReasons.size === 0) {
            nextSource.play();
        }

        this.activeMusicSourceIndex = nextSourceIndex;

        tween(nextSource)
            .to(AudioManager.CROSSFADE_DURATION_SECONDS, { volume: this.musicVolume })
            .start();

        const outgoingStartVolume = previousSource.volume;
        tween(previousSource)
            .to(AudioManager.CROSSFADE_DURATION_SECONDS, { volume: 0 })
            .call(() => {
                if (transitionId !== this.transitionVersion) {
                    return;
                }

                previousSource.stop();
                previousSource.clip = null;
                previousSource.volume = outgoingStartVolume;
            })
            .start();
    }

    private hasSamePlaylist(nextPlaylist: ReadonlyArray<string>): boolean {
        if (nextPlaylist.length !== this.playlistPaths.length) {
            return false;
        }

        return nextPlaylist.every((musicPath, index) => musicPath === this.playlistPaths[index]);
    }

    private normalizePlaylistIndex(index: number, playlistLength: number): number {
        if (playlistLength <= 0) {
            return 0;
        }

        const normalizedIndex = index % playlistLength;
        return normalizedIndex < 0 ? normalizedIndex + playlistLength : normalizedIndex;
    }

    private pickRandomPlaylistIndex(playlistLength: number): number {
        if (playlistLength <= 1) {
            return 0;
        }

        return Math.floor(Math.random() * playlistLength);
    }

    private stopMusicTransitions(): void {
        this.musicSources.forEach((source) => {
            Tween.stopAllByTarget(source);
        });
    }

    private getActiveMusicSource(): AudioSource {
        return this.musicSources[this.activeMusicSourceIndex];
    }

    private getInactiveMusicSourceIndex(): number {
        return this.activeMusicSourceIndex === 0 ? 1 : 0;
    }

    private onPiecesMerged(): void {
        this.playSfx(SFX_IDS.MERGE);
    }

    private onPuzzleCompleted(): void {
        this.playSfx(SFX_IDS.WINNER);
    }

    private async playSfxInternal(sfxId: string): Promise<void> {
        try {
            if (this.suspensionReasons.size > 0) {
                return;
            }

            const clipPath = this.resolveSfxPath(sfxId);
            const clip = await this.clipProvider.getClip(clipPath);

            if (this.suspensionReasons.size > 0) {
                return;
            }

            this.sfxSource.volume = this.sfxVolume;
            this.sfxSource.playOneShot(clip, 1);
        } catch (error) {
            console.warn(`[AudioManager] Failed to play sfx "${sfxId}".`, error);
        }
    }

    private resolveMusicPath(musicId: string): string {
        if (musicId.startsWith(`${MUSIC_RESOURCE_PATH}/`)) {
            return musicId;
        }

        return `${MUSIC_RESOURCE_PATH}/${musicId}`;
    }

    private resolveSfxPath(sfxId: string): string {
        if (sfxId.startsWith(`${SFX_RESOURCE_PATH}/`)) {
            return sfxId;
        }

        return `${SFX_RESOURCE_PATH}/${sfxId}`;
    }
}
