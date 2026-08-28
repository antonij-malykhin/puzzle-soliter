import { SpriteFrame } from 'cc';
import { IImageLoader } from '../Data/Interfaces/IImageLoader';
import { IImageBundleLoader } from '../Data/Interfaces/IImageBundleLoader';
import { IImageDownloader } from '../Data/Interfaces/IImageDownloader';

const BUNDLE_IMAGE_PATTERN = /^sprites\/images\/regions\/region-(\d+)\/(.+)$/;

export class ImageService {
    private readonly cache = new Map<string, SpriteFrame>();

    public constructor(
        private readonly imageLoader: IImageLoader,
        private readonly imageBundleLoader: IImageBundleLoader,
        private readonly imageDownloader: IImageDownloader
        ) {}

    public async getImageById(imageId: string): Promise<SpriteFrame> {
        const cached = this.cache.get(imageId);
        if (cached) {
            return cached;
        }

        const loadedImage = await this.resolveImage(imageId);
        this.cache.set(imageId, loadedImage);
        return loadedImage;
    }

    private resolveImage(imageId: string): Promise<SpriteFrame> {
        const bundleMatch = BUNDLE_IMAGE_PATTERN.exec(imageId);
        if (bundleMatch && Number(bundleMatch[1]) > 1) {
            return this.imageBundleLoader.loadImageFromBundle(`region-${bundleMatch[1]}`, bundleMatch[2]);
        }

        return this.imageLoader.loadImage(imageId);
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
