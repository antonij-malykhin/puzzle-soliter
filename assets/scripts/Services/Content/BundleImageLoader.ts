import { assetManager, SpriteFrame } from 'cc';
import { AssetManager } from 'cc';
import { IImageBundleLoader } from '../../Data/Interfaces/IImageBundleLoader';

export class BundleImageLoader implements IImageBundleLoader {
    private readonly bundles = new Map<string, AssetManager.Bundle>();

    public async loadImageFromBundle(bundleName: string, imagePath: string): Promise<SpriteFrame> {
        const bundle = await this.loadBundle(bundleName);
        return new Promise<SpriteFrame>((resolve, reject) => {
            bundle.load(imagePath, SpriteFrame, (error, spriteFrame) => {
                if (error || !spriteFrame) {
                    reject(error ?? new Error(`SpriteFrame not found in bundle "${bundleName}" for path: ${imagePath}`));
                    return;
                }

                resolve(spriteFrame);
            });
        });
    }

    private loadBundle(bundleName: string): Promise<AssetManager.Bundle> {
        const cachedBundle = this.bundles.get(bundleName);
        if (cachedBundle) {
            return Promise.resolve(cachedBundle);
        }

        const existingBundle = assetManager.getBundle(bundleName);
        if (existingBundle) {
            this.bundles.set(bundleName, existingBundle);
            return Promise.resolve(existingBundle);
        }

        return new Promise<AssetManager.Bundle>((resolve, reject) => {
            assetManager.loadBundle(bundleName, (error, bundle) => {
                if (error || !bundle) {
                    reject(error ?? new Error(`Bundle not found: ${bundleName}`));
                    return;
                }

                this.bundles.set(bundleName, bundle);
                resolve(bundle);
            });
        });
    }
}