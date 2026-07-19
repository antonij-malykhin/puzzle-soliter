import { LevelData } from '../Models/LevelData';

export interface ILevelProvider {
    getLevel(levelId: string): Promise<LevelData>;
    getTrainingLevelId(): string;
}
