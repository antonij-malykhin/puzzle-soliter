export interface LevelCatalogEntry {
    levelId: string;
    levelNumber: number;
    gridX: number;
    gridY: number;
    cardBackFrontImageId: string;
}

export interface LevelCatalogData {
    regionImageId: string;
    cols: number;
    rows: number;
    spacingX: number;
    spacingY: number;
    levels: LevelCatalogEntry[];
}
