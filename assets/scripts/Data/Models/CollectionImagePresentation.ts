import type { SpriteFrame } from 'cc';

export interface CollectionImagePresentation {
	cellId: string;
	isRegion: boolean;
	spriteFrame: SpriteFrame | null;
	isCompleted: boolean;
	levelNumber: number | null;
	label: string;
}