import { SpriteFrame } from 'cc';
import { IImageLoader } from '../Data/Interfaces/IImageLoader';
import { IImageBundleLoader } from '../Data/Interfaces/IImageBundleLoader';
import { IImageDownloader } from '../Data/Interfaces/IImageDownloader';

const BUNDLE_IMAGE_PATTERN = /^sprites\/images\/regions\/region-(\d+)\/(.+)$/;

interface ImagePreloadOptions {
    readonly batchSize?: number;
    readonly batchYieldMs?: number;
}

export class ImageService {
    private readonly cache = new Map<string, SpriteFrame>();
    private readonly inFlight = new Map<string, Promise<SpriteFrame>>();

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

        const pending = this.inFlight.get(imageId);
        if (pending) {
            return pending;
        }

        const loadPromise = (async () => {
            try {
                const loadedImage = await this.resolveImage(imageId);
                this.cache.set(imageId, loadedImage);
                return loadedImage;
            } finally {
                this.inFlight.delete(imageId);
            }
        })();

        this.inFlight.set(imageId, loadPromise);
        return loadPromise;
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

        const pending = this.inFlight.get(imageUrl);
        if (pending) {
            return pending;
        }

        const loadPromise = (async () => {
            try {
                const downloadedImage = await this.imageDownloader.downloadImage(imageUrl);
                this.cache.set(imageUrl, downloadedImage);
                return downloadedImage;
            } finally {
                this.inFlight.delete(imageUrl);
            }
        })();

        this.inFlight.set(imageUrl, loadPromise);
        return loadPromise;
    }

    public async preloadImagesByIds(
        imageIds: ReadonlyArray<string>,
        options?: ImagePreloadOptions,
    ): Promise<void> {
        const uniqueIds = Array.from(new Set(imageIds.filter((imageId) => Boolean(imageId))));
        if (uniqueIds.length === 0) {
            return;
        }

        const batchSize = Math.max(1, Math.floor(options?.batchSize ?? uniqueIds.length));
        const batchYieldMs = Math.max(0, Math.floor(options?.batchYieldMs ?? 0));

        for (let index = 0; index < uniqueIds.length; index += batchSize) {
            const batch = uniqueIds.slice(index, index + batchSize);
            await Promise.all(
                batch.map(async (imageId) => {
                    try {
                        await this.getImageById(imageId);
                    } catch {
                        // Preload should not block gameplay if one image is missing.
                    }
                }),
            );

            if (batchYieldMs > 0 && index + batchSize < uniqueIds.length) {
                await new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), batchYieldMs);
                });
            }
        }
    }
}
