import { ILevelProvider } from '../Data/Interfaces/ILevelProvider';
import { LevelData } from '../Data/Models/LevelData';

export class LevelService {
    public constructor(private readonly levelProvider: ILevelProvider) {}

    public getTrainingLevelId(): string {
        return this.levelProvider.getTrainingLevelId();
    }

    public getLevel(levelId: string): Promise<LevelData> {
        return this.levelProvider.getLevel(levelId);
    }
}
