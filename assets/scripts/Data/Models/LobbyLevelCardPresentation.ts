import { SpriteFrame } from 'cc';

export interface LobbyLevelCardPresentation {
	levelId: string;
	levelNumber: number;
	gridX: number;
	gridY: number;
    width: number;
    height: number;
	isUnlocked: boolean;
	isCompleted: boolean;
	isCurrent: boolean;
	shouldAnimateFlip: boolean;
	frontSpriteFrame: SpriteFrame | null;
	backSpriteFrame: SpriteFrame | null;
	regionId: string;
	regionCardIndex: number;
	regionCardCount: number;
}