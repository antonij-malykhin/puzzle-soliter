import { SpriteFrame } from 'cc';

export interface IImageBundleLoader {
    loadImageFromBundle(bundleName: string, imagePath: string): Promise<SpriteFrame>;
}