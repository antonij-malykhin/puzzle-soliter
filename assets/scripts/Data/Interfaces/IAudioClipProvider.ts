import { AudioClip } from 'cc';

export interface IAudioClipProvider {
    getClip(clipPath: string): Promise<AudioClip>;
}
