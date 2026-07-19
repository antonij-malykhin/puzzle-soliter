import { resources, SpriteFrame } from 'cc';
import { IImageLoader } from '../../Data/Interfaces/IImageLoader';

export class ResourcesImageLoader implements IImageLoader {
    public async loadImage(imageId: string): Promise<SpriteFrame> {
        return new Promise<SpriteFrame>((resolve, reject) => {
            resources.load(imageId, SpriteFrame, (error, spriteFrame) => {
                if (error || !spriteFrame) {
                    reject(error ?? new Error(`SpriteFrame not found for id: ${imageId}`));
                    return;
                }

                resolve(spriteFrame);
            });
        });
    }
}
