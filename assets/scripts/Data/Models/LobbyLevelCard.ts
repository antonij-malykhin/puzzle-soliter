export interface LobbyLevelCard {
    levelId: string;
    levelNumber: number;
    gridX: number;
    gridY: number;
    isUnlocked: boolean;
    isCompleted: boolean;
    isCurrent: boolean;
    shouldAnimateFlip: boolean;
    cardImageId?: string;
}
