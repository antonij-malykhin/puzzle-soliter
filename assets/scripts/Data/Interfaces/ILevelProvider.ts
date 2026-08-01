import { LevelData } from '../Models/LevelData';
import { LevelCatalogData, LevelCatalogEntry } from '../Models/LevelCatalog';

export interface ILevelProvider {
    getLevel(levelId: string): Promise<LevelData>;
    getTrainingLevelId(): string;
    getLevelCatalog(regionNumber: number): Promise<LevelCatalogData>;
}
