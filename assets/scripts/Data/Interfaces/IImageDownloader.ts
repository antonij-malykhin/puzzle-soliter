import type { SpriteFrame } from 'cc';

export interface IImageDownloader {
    downloadImage(imageUrl: string): Promise<SpriteFrame>;
}