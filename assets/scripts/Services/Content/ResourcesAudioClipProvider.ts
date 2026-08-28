import { AudioClip, resources } from 'cc';
import { IAudioClipProvider } from '../../Data/Interfaces/IAudioClipProvider';

export class ResourcesAudioClipProvider implements IAudioClipProvider {
    private readonly clipCache = new Map<string, AudioClip>();

    public async getClip(clipPath: string): Promise<AudioClip> {
        const cachedClip = this.clipCache.get(clipPath);
        if (cachedClip) {
            return cachedClip;
        }

        const loadedClip = await new Promise<AudioClip>((resolve, reject) => {
            resources.load(clipPath, AudioClip, (error, audioClip) => {
                if (error || !audioClip) {
                    reject(error ?? new Error(`AudioClip not found for path: ${clipPath}`));
                    return;
                }

                resolve(audioClip);
            });
        });

        this.clipCache.set(clipPath, loadedClip);
        return loadedClip;
    }
}
