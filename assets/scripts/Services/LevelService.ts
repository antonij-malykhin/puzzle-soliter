import { ILevelProvider } from '../Data/Interfaces/ILevelProvider';
import { LevelCatalogData } from '../Data/Models/LevelCatalog';
import { LevelData } from '../Data/Models/LevelData';

export class LevelService {
    public constructor(private readonly levelProvider: ILevelProvider) {}

    public getTrainingLevelId(): string {
        return this.levelProvider.getTrainingLevelId();
    }

    public getLevel(levelId: string): Promise<LevelData> {
        return this.levelProvider.getLevel(levelId);
    }

    public getLevelCatalog(regionNumber: number): Promise<LevelCatalogData> {
        return this.levelProvider.getLevelCatalog(regionNumber);
    }

    public async getOrderedLevelIds(regionNumber: number): Promise<ReadonlyArray<string>> {
        const catalog = await this.getLevelCatalog(regionNumber);
        return catalog.levels.map((entry) => entry.levelId);
    }
}
