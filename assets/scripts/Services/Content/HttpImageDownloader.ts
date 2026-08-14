import { assetManager, ImageAsset, SpriteFrame, Texture2D } from 'cc';
import { IImageDownloader } from '../../Data/Interfaces/IImageDownloader';

export class HttpImageDownloader implements IImageDownloader {
    public downloadImage(imageUrl: string): Promise<SpriteFrame> {
        return this.downloadRemote(imageUrl);
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        }
        return this.downloadLocal(imageUrl);
    }

    private downloadRemote(imageUrl: string): Promise<SpriteFrame> {
        return new Promise<SpriteFrame>((resolve, reject) => {
            assetManager.loadRemote<ImageAsset>(imageUrl, { ext: '.png' }, (err, imageAsset) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!imageAsset) {
                    reject(new Error(`Failed to load image from: ${imageUrl}`));
                    return;
                }
                resolve(this.createSpriteFrame(imageAsset));
            });
        });
    }

    private downloadLocal(imageUrl: string): Promise<SpriteFrame> {
        return new Promise<SpriteFrame>((resolve, reject) => {
            assetManager.loadAny({ url: imageUrl }, (err, imageAsset: ImageAsset | null) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!imageAsset) {
                    reject(new Error(`Failed to load image from: ${imageUrl}`));
                    return;
                }
                resolve(this.createSpriteFrame(imageAsset));
            });
        });
    }

    private createSpriteFrame(imageAsset: ImageAsset): SpriteFrame {
        const texture = new Texture2D();
        texture.image = imageAsset;

        const spriteFrame = new SpriteFrame();
        spriteFrame.texture = texture;
        return spriteFrame;
    }
}
