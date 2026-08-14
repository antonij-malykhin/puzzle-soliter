import { SpriteFrame } from 'cc';
import { IImageLoader } from '../Data/Interfaces/IImageLoader';
import { IImageDownloader } from '../Data/Interfaces/IImageDownloader';

export class ImageService {
    private readonly cache = new Map<string, SpriteFrame>();

    public constructor(
        private readonly imageLoader: IImageLoader,
        private readonly imageDownloader: IImageDownloader
        ) {}

    public async getImageById(imageId: string): Promise<SpriteFrame> {
        const cached = this.cache.get(imageId);
        if (cached) {
            return cached;
        }

        const loadedImage = await this.imageLoader.loadImage(imageId);
        this.cache.set(imageId, loadedImage);
        return loadedImage;
    }

    public async getImageByUrl(imageUrl: string): Promise<SpriteFrame> {
        const cached = this.cache.get(imageUrl);
        if (cached) {
            return cached;
        }

        const downloadedImage = await this.imageDownloader.downloadImage(imageUrl);
        this.cache.set(imageUrl, downloadedImage);
        return downloadedImage;
    }
}
