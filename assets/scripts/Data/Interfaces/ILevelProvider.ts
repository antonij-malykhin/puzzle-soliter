import { LevelData } from '../Models/LevelData';
import { LevelCatalogEntry } from '../Models/LevelCatalog';

export interface ILevelProvider {
    getLevel(levelId: string): Promise<LevelData>;
    getTrainingLevelId(): string;
    getLevelCatalog(): Promise<ReadonlyArray<LevelCatalogEntry>>;
}
