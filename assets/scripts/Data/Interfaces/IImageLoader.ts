import { SpriteFrame } from 'cc';

export interface IImageLoader {
    loadImage(imageId: string): Promise<SpriteFrame>;
}
