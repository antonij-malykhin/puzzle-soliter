import { ILevelProvider } from '../Data/Interfaces/ILevelProvider';
import { LevelCatalogEntry } from '../Data/Models/LevelCatalog';
import { LevelData } from '../Data/Models/LevelData';

export class LevelService {
    public constructor(private readonly levelProvider: ILevelProvider) {}

    public getTrainingLevelId(): string {
        return this.levelProvider.getTrainingLevelId();
    }

    public getLevel(levelId: string): Promise<LevelData> {
        return this.levelProvider.getLevel(levelId);
    }

    public getLevelCatalog(): Promise<ReadonlyArray<LevelCatalogEntry>> {
        return this.levelProvider.getLevelCatalog();
    }

    public async getOrderedLevelIds(): Promise<ReadonlyArray<string>> {
        const catalog = await this.getLevelCatalog();
        return catalog.map((entry) => entry.levelId);
    }
}
