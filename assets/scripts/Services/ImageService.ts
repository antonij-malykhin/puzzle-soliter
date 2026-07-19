import { SpriteFrame } from 'cc';
import { IImageLoader } from '../Data/Interfaces/IImageLoader';

export class ImageService {
    private readonly cache = new Map<string, SpriteFrame>();

    public constructor(private readonly imageLoader: IImageLoader) {}

    public async getImage(imageId: string): Promise<SpriteFrame> {
        const cached = this.cache.get(imageId);
        if (cached) {
            return cached;
        }

        const loadedImage = await this.imageLoader.loadImage(imageId);
        this.cache.set(imageId, loadedImage);
        return loadedImage;
    }
}
