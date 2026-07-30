export interface LevelCatalogEntry {
    levelId: string;
    levelNumber: number;
    gridX: number;
    gridY: number;
    cardImageId?: string;
}

export interface LevelCatalogData {
    levels: LevelCatalogEntry[];
}
